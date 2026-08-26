"use strict";

/**
 * Evolution Upload Client — uploads sanitized evolution telemetry to minitok server.
 *
 * ENFORCES fail-closed policy:
 * 1. entitlement must exist and be valid
 * 2. entitlement must not be expired
 * 3. "evolution_upload" feature must be present
 * 4. user opt-in must be enabled
 * 5. sanitizer must pass
 * 6. only then: network request
 *
 * If ANY step fails → NO NETWORK REQUEST.
 */

const https = require("https");
const http = require("http");
const { checkEntitlement } = require("../entitlement/gate");
const { sanitizeEvolutionOutcome } = require("./sanitize");
const { EvolutionOptIn } = require("./optin");

/**
 * Upload a sanitized evolution outcome to the server.
 *
 * @param {object} outcome - raw EvolutionOutcome from KnowledgeStore
 * @param {object} [options]
 * @param {string} [options.serverUrl] - override server URL
 * @param {string} [options.token] - JWT installation token
 * @param {object} [options._entitlementCheck] - override for testing
 * @param {object} [options._optIn] - override EvolutionOptIn for testing
 * @param {Function} [options._httpPost] - override HTTP client for testing
 * @param {Function} [options._sanitizer] - override sanitizer for testing
 * @returns {{ sent: boolean, reason?: string }}
 */
async function uploadEvolutionOutcome(outcome, options = {}) {
  // Step 1: Entitlement gate (fail-closed)
  const entitlement = options._entitlementCheck || checkEntitlement();
  if (!entitlement.allowed) {
    return { sent: false, reason: `Entitlement check failed: ${entitlement.state}` };
  }

  // Step 2: Check "evolution_upload" feature
  const features = entitlement.entitlement?.features || [];
  if (!features.includes("evolution_upload")) {
    return { sent: false, reason: "Feature 'evolution_upload' not in entitlement" };
  }

  // Step 3: User opt-in (fail-closed: default OFF)
  const optIn = options._optIn || new EvolutionOptIn();
  if (!optIn.isEnabled()) {
    return { sent: false, reason: "Evolution upload not opted-in by user" };
  }

  // Step 4: Sanitize payload (strict allowlist)
  const sanitize = options._sanitizer || sanitizeEvolutionOutcome;
  const result = sanitize(outcome);
  if (!result.ok) {
    return { sent: false, reason: `Sanitization failed: ${result.reason}` };
  }

  // Step 5: Server URL + token required
  const serverUrl = options.serverUrl;
  const token = options.token;
  if (!serverUrl || !token) {
    return { sent: false, reason: "Server URL or token not configured" };
  }

  // Step 6: Network request (ONLY after all checks pass)
  const httpPost = options._httpPost || _defaultHttpPost;
  try {
    const response = await httpPost(
      serverUrl + "/v1/evolution/telemetry",
      result.payload,
      { Authorization: "Bearer " + token }
    );
    if (response.ok) {
      return { sent: true };
    }
    return { sent: false, reason: `Server responded ${response.status}` };
  } catch (err) {
    return { sent: false, reason: `Network error: ${err.message}` };
  }
}

function _defaultHttpPost(urlString, body, headers) {
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
      timeout: 10000,
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

module.exports = { uploadEvolutionOutcome };