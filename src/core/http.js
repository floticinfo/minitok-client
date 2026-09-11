"use strict";

const { AuthError } = require("./errors");

/**
 * Shared proxy-aware HTTP helpers. Corporate customers commonly sit behind
 * HTTPS_PROXY; raw https.request and bare fetch both bypass it silently,
 * which shows up as "server unreachable"/"provider unavailable".
 */

let cachedDispatcher;

function proxyUrl() {
  return process.env.HTTPS_PROXY || process.env.https_proxy || process.env.HTTP_PROXY || process.env.http_proxy || null;
}

function shouldBypassProxy(urlString) {
  const noProxy = process.env.NO_PROXY || process.env.no_proxy;
  if (!noProxy) return false;
  let hostname;
  try { hostname = new URL(urlString).hostname; } catch { return false; }
  return noProxy.split(",").map(s => s.trim().toLowerCase()).filter(Boolean).some(entry => {
    if (entry === "*") return true;
    if (hostname === entry.replace(/^\./, "")) return true;
    return hostname.endsWith(entry.startsWith(".") ? entry : `.${entry}`);
  });
}

/** Returns an undici ProxyAgent dispatcher, or undefined when no proxy applies. */
function getProxyDispatcher(urlString) {
  const proxy = proxyUrl();
  if (!proxy || shouldBypassProxy(urlString)) return undefined;
  if (cachedDispatcher?.proxy === proxy) return cachedDispatcher.agent;
  try {
    const { ProxyAgent } = require("undici");
    cachedDispatcher = { proxy, agent: new ProxyAgent(proxy) };
    return cachedDispatcher.agent;
  } catch {
    return undefined;
  }
}

/**
 * POST JSON with the same semantics as node http.request but proxy-aware.
 * Mirrors the interface of postValidation in entitlement/online.js.
 */
const MAX_RESPONSE_BYTES = 2 * 1024 * 1024;

function timeoutError(error) {
  return error?.name === "AbortError" ? new AuthError("Authentication request timed out") : error;
}

async function fetchWithTimeout(urlString, options = {}, timeoutMs = 10000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const finish = () => clearTimeout(timer);
  const dispatcher = getProxyDispatcher(urlString);
  let response;
  try {
    response = await fetch(urlString, { ...options, ...(dispatcher ? { dispatcher } : {}), signal: controller.signal });
  } catch (error) {
    finish();
    throw timeoutError(error);
  }
  if (!response.body || typeof response.body.getReader !== "function") {
    finish();
    return response;
  }
  const wrappedBody = new Proxy(response.body, {
    get(target, property, receiver) {
      if (property === "getReader") return (...args) => {
        const reader = target.getReader(...args);
        const read = reader.read.bind(reader);
        reader.read = async (...readArgs) => {
          try {
            const result = await read(...readArgs);
            if (result.done) finish();
            return result;
          } catch (error) {
            finish();
            throw timeoutError(error);
          }
        };
        const cancel = reader.cancel.bind(reader);
        reader.cancel = async (...cancelArgs) => { try { return await cancel(...cancelArgs); } finally { finish(); } };
        return reader;
      };
      return Reflect.get(target, property, receiver);
    },
  });
  return new Proxy(response, {
    get(target, property, receiver) {
      if (property === "body") return wrappedBody;
      if (["json", "text", "arrayBuffer", "blob", "formData"].includes(String(property))) {
        return async (...args) => { try { return await target[property](...args); } catch (error) { throw timeoutError(error); } finally { finish(); } };
      }
      return Reflect.get(target, property, target);
    },
  });
}

async function readCappedResponse(res, maxBytes = MAX_RESPONSE_BYTES) {
  const declared = Number(res.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > maxBytes) throw new Error("HTTP response body too large");
  if (!res.body || typeof res.body.getReader !== "function") throw new Error("HTTP response body is unavailable");
  const reader = res.body.getReader();
  let data = "";
  let total = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maxBytes) {
        await reader.cancel();
        throw new Error("HTTP response body too large");
      }
      data += Buffer.from(value).toString("utf8");
    }
    return data;
  } catch (error) {
    throw timeoutError(error);
  } finally {
    try { reader.releaseLock(); } catch {}
  }
}

function postJson(urlString, body, timeoutMs = 10000, extraHeaders = {}) {
  return new Promise((resolve, reject) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const serialized = typeof body === "string" ? body : JSON.stringify(body);
    const opts = {
      method: "POST",
      headers: { "Content-Type": "application/json", ...extraHeaders },
      signal: controller.signal,
    };
    const dispatcher = getProxyDispatcher(urlString);
    if (dispatcher) opts.dispatcher = dispatcher;
    fetch(urlString, { ...opts, body: serialized })
      .then(async (res) => {
        const declared = Number(res.headers.get("content-length"));
        if (Number.isFinite(declared) && declared > MAX_RESPONSE_BYTES) {
          throw new Error("HTTP response body too large");
        }
        const reader = res.body?.getReader();
        let data = "";
        if (reader) {
          let total = 0;
          for (;;) {
            const { done, value } = await reader.read();
            if (done) break;
            total += value.byteLength;
            if (total > MAX_RESPONSE_BYTES) {
              await reader.cancel();
              throw new Error("HTTP response body too large");
            }
            data += Buffer.from(value).toString("utf8");
          }
        } else {
          data = await res.text();
          if (Buffer.byteLength(data, "utf8") > MAX_RESPONSE_BYTES) throw new Error("HTTP response body too large");
        }
        let parsed = null;
        try { parsed = JSON.parse(data); } catch {}
        resolve({ ok: res.status >= 200 && res.status < 300, status: res.status, body: parsed });
      })
      .catch((err) => {
        if (err?.name === "AbortError") reject(new Error("Validation request timed out"));
        else reject(new Error(err?.message || "HTTP request failed"));
      })
      .finally(() => clearTimeout(timer));
  });
}

module.exports = { getProxyDispatcher, shouldBypassProxy, fetchWithTimeout, readCappedResponse, postJson, MAX_RESPONSE_BYTES };
