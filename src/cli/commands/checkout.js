const https = require("https");
const http = require("http");
const { resolveServerUrl } = require("./server-config");
const { loadCustomerToken } = require("../../auth/customer-token");

async function cmdCheckout(opts) {
  const serverUrl = resolveServerUrl({ cliServer: opts?.server });
  const token = opts?.token || loadCustomerToken();
  if (!token) {
    console.error("Error: Authentication token required.");
    console.error("Usage: minitok checkout --token <JWT> [--plan pro]");
    return 1;
  }

  const planId = opts?.plan || "pro";
  const endpoint = "/v1/checkout/dodo";
  console.log("Creating checkout session for plan: " + planId + " (" + endpoint + ")");

  let result;
  try {
    result = await _httpPost("" + serverUrl + endpoint,
      { planId },
      { Authorization: "Bearer " + token });
  } catch (err) {
    console.error("Error: Cannot connect to server at " + serverUrl);
    console.error(err.message);
    return 1;
  }

  if (!result.ok) {
    console.error("Error: " + (result.body?.error || "Checkout failed"));
    return 1;
  }

  const { checkout_url } = result.body;
  if (!checkout_url) {
    console.error("Error: Server did not return a checkout URL.");
    return 1;
  }

  console.log("");
  console.log("Checkout URL:");
  console.log(checkout_url);
  console.log("");
  console.log("Open the URL above to complete your purchase.");
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

module.exports = { cmdCheckout };
