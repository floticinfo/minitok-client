"use strict";

const fs = require("fs");
const path = require("path");
const os = require("os");
const https = require("https");
const http = require("http");
const { checkEntitlement, GateState } = require("./gate");

const DEFAULT_ENTITLEMENT_DIR = path.join(os.homedir(), ".minitok", "entitlement");
const INSTALLATION_TOKEN_FILE = "installation-token.json";

function loadInstallationRecord(entitlementDir) {
  const file = path.join(entitlementDir || DEFAULT_ENTITLEMENT_DIR, INSTALLATION_TOKEN_FILE);
  try {
    const record = JSON.parse(fs.readFileSync(file, "utf-8"));
    if (!record || typeof record.token !== "string" || typeof record.installation_id !== "string") return null;
    return record;
  } catch {
    return null;
  }
}

function postValidation(urlString, body, timeoutMs = 10000) {
  return new Promise((resolve, reject) => {
    const url = new URL(urlString);
    const transport = url.protocol === "https:" ? https : http;
    const payload = JSON.stringify(body);
    const request = transport.request({
      hostname: url.hostname,
      port: url.port || (url.protocol === "https:" ? 443 : 80),
      path: url.pathname,
      method: "POST",
      headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(payload) },
      timeout: timeoutMs,
    }, (response) => {
      let data = "";
      response.on("data", chunk => { data += chunk; });
      response.on("end", () => {
        let parsed = null;
        try { parsed = JSON.parse(data); } catch {}
        resolve({ ok: response.statusCode >= 200 && response.statusCode < 300, status: response.statusCode, body: parsed });
      });
    });
    request.on("error", reject);
    request.on("timeout", () => { request.destroy(new Error("Validation request timed out")); });
    request.write(payload);
    request.end();
  });
}

async function checkEntitlementOnline(options = {}) {
  const local = checkEntitlement(options);
  if (!local.allowed) return local;

  const record = loadInstallationRecord(options.entitlementDir);
  const serverUrl = options.serverUrl;
  if (!serverUrl || !record) {
    return { ...local, offline: true, offlineSemantics: "valid-signed-entitlement-until-expires_at" };
  }

  try {
    const response = await (options._validate || postValidation)(`${serverUrl.replace(/\/$/, "")}/v1/validate`, {
      token: record.token,
      entitlement: options._loadArtifact ? options._loadArtifact() : undefined,
    });
    if (!response.ok || !response.body || response.body.valid !== true) {
      return { allowed: false, state: GateState.SERVER_REJECTED, message: response.body?.error || "Server did not authorize this installation." };
    }
    return { ...local, serverValidated: true, subscription: response.body.subscription };
  } catch {
    return { allowed: false, state: GateState.SERVER_UNREACHABLE, message: "The entitlement server could not be reached. Paid execution is blocked until online validation succeeds." };
  }
}

module.exports = { checkEntitlementOnline, loadInstallationRecord, postValidation };
