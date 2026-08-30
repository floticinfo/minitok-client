"use strict";

/**
 * minitok activation-key — Retrieve your activation key.
 *
 * Calls POST /v1/activation-key with the customer JWT and returns the
 * plaintext activation key (exactly once) for a Dodo subscription payment.
 */

const https = require("https");
const http = require("http");
const { resolveServerUrl } = require("./server-config");
const { loadCustomerToken } = require("../../auth/customer-token");

/**
 * Retrieve the activation key for the authenticated customer.
 * @param {object} opts
 * @param {string} [opts.token] - Customer JWT (required)
 * @param {string} [opts.payment] - Optional Dodo payment ID
 * @param {string} [opts.server] - minitok server URL
 * @returns {Promise<number>} Exit code
 */
async function cmdActivationKey(opts) {
  const serverUrl = resolveServerUrl({ cliServer: opts?.server });
  const token = opts?.token || loadCustomerToken();
  if (!token) {
    console.error("Error: Authentication token required.");
    console.error("Usage: minitok activation-key --token <JWT> [--payment <dodo_payment_id>]");
    return 1;
  }

  // Send the JWT to POST /v1/activation-key
  const body = {};
  if (opts?.payment) body.dodo_payment_id = opts.payment;

  let result;
  try {
    result = await _httpPost(serverUrl + "/v1/activation-key", body, {
      Authorization: "Bearer " + token,
    });
  } catch (err) {
    console.error("Error: Cannot connect to server at " + serverUrl);
    console.error(err.message);
    return 1;
  }

  if (!result.ok) {
    console.error("Error: " + (result.body?.error || "Activation key retrieval failed"));
    return 1;
  }

  const { activation_key } = result.body;
  if (!activation_key) {
    console.error("Error: Server did not return an activation key.");
    return 1;
  }

  console.log("");
  console.log("Your activation key:");
  console.log(activation_key);
  console.log("");
  console.log("Activate with: minitok activate <activation-key>");
  return 0;
}

function _httpPost(urlString, body, headers) {
  return new Promise((resolve, reject) => {
    const url = new URL(urlString);
    const isHttps = url.protocol === "https:";
    const mod = isHttps ? https : http;
    const payload = JSON.stringify(body);
    const req = mod.request({
      hostname: url.hostname,
      port: url.port || (isHttps ? 443 : 80),
      path: url.pathname,
      method: "POST",
      headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(payload), ...headers },
      timeout: 30000,
    }, (res) => {
      let data = "";
      res.on("data", (c) => (data += c));
      res.on("end", () => {
        let parsed = null;
        try { parsed = JSON.parse(data); } catch {}
        resolve({ ok: res.statusCode >= 200 && res.statusCode < 300, status: res.statusCode, body: parsed });
      });
    });
    req.on("error", reject);
    req.on("timeout", () => { req.destroy(); reject(new Error("Request timed out")); });
    req.write(payload);
    req.end();
  });
}

module.exports = { cmdActivationKey };
