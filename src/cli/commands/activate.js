"use strict";

/**
 * minitok activate <key> — Client-side activation flow.
 *
 * Calls POST /v1/activate on the minitok server, stores the returned
 * entitlement + installation_token locally, enabling the entitlement gate.
 *
 * Flow:
 *   1. Resolve server URL
 *   2. Generate installation_id (UUID)
 *   3. POST /v1/activate { key, installation_id }
 *   4. Store entitlement artifact in ~/.minitok/entitlement/
 *   5. Store installation token in ~/.minitok/entitlement/installation-token.json
 *   6. Update gate-state.json for offline grace baseline
 */

const https = require("https");
const http = require("http");
const { randomUUID } = require("crypto");
const { EntitlementStore, DEFAULT_ENTITLEMENT_DIR } = require("../../entitlement/store");
const { saveGateState } = require("../../entitlement/gate");
const { resolveServerUrl } = require("./server-config");

const INSTALLATION_TOKEN_FILE = "installation-token.json";

async function cmdActivate(key, opts) {
  if (!key || typeof key !== "string") {
    console.error("Error: Activation key required.\n\nUsage: minitok activate <key>");
    return 1;
  }

  // 1. Resolve server URL
  const serverUrl = resolveServerUrl({ cliServer: opts?.server });

  // 2. Generate installation identity
  const installationId = randomUUID();
  console.log(`Activating against ${serverUrl}...`);

  // 3. Call POST /v1/activate
  let result;
  try {
    result = await _httpPost(`${serverUrl}/v1/activate`, {
      key,
      installation_id: installationId,
    });
  } catch (err) {
    console.error(`Error: Cannot connect to server at ${serverUrl}\n${err.message}`);
    return 1;
  }

  if (!result.ok) {
    const errMsg = result.body?.error || result.statusText || "Activation failed";
    console.error(`Error: ${errMsg}`);
    return 1;
  }

  const { entitlement, installation_token } = result.body;
  if (!entitlement || !installation_token) {
    console.error("Error: Server returned incomplete activation response.");
    return 1;
  }

  // 4. Store entitlement artifact
  try {
    const store = new EntitlementStore();
    store.save(entitlement);
  } catch (err) {
    console.error(`Error: Failed to store entitlement: ${err.message}`);
    return 1;
  }

  // 5. Store installation token
  try {
    const tokenDir = DEFAULT_ENTITLEMENT_DIR;
    const fs = require("fs");
    const path = require("path");
    fs.mkdirSync(tokenDir, { recursive: true });
    const tokenFile = path.join(tokenDir, INSTALLATION_TOKEN_FILE);
    const record = {
      token: installation_token,
      installation_id: installationId,
      saved_at: new Date().toISOString(),
    };
    const tmp = tokenFile + ".tmp";
    fs.writeFileSync(tmp, JSON.stringify(record, null, 2), "utf-8", { mode: 0o600 });
    fs.renameSync(tmp, tokenFile);
    try { fs.chmodSync(tokenFile, 0o600); } catch {}
  } catch (err) {
    console.error(`Error: Failed to store installation token: ${err.message}`);
    return 1;
  }

  // 6. Initialize gate state baseline
  try {
    const now = new Date();
    saveGateState({
      latest_observed_at: now.getTime(),
      last_validated_at: now.toISOString(),
    });
  } catch {}

  // 7. Display success
  const payload = entitlement.payload || {};
  console.log("\nActivation successful.\n");
  console.log(`  Plan:       ${payload.plan_id || "unknown"}`);
  console.log(`  Expires:    ${payload.expires_at || "unknown"}`);
  console.log(`  Installation: ${installationId}`);
  console.log(`  Server:     ${serverUrl}`);
  console.log("");

  return 0;
}

/**
 * Minimal HTTP POST helper (no external dependencies).
 * @returns {{ ok: boolean, status: number, statusText: string, body: object|null }}
 */
function _httpPost(urlString, body) {
  return new Promise((resolve, reject) => {
    const url = new URL(urlString);
    const isHttps = url.protocol === "https:";
    const mod = isHttps ? https : http;
    const payload = JSON.stringify(body);

    const req = mod.request(
      {
        hostname: url.hostname,
        port: url.port || (isHttps ? 443 : 80),
        path: url.pathname,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(payload),
        },
        timeout: 30000,
      },
      (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          let parsed = null;
          try { parsed = JSON.parse(data); } catch {}
          resolve({
            ok: res.statusCode >= 200 && res.statusCode < 300,
            status: res.statusCode,
            statusText: res.statusMessage || "",
            body: parsed,
          });
        });
      }
    );

    req.on("error", reject);
    req.on("timeout", () => { req.destroy(); reject(new Error("Request timed out")); });
    req.write(payload);
    req.end();
  });
}

module.exports = { cmdActivate };
