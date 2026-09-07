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

const { authorizeEntitlement } = require("../entitlement/policy");
const { sanitizeEvolutionOutcome } = require("./sanitize");
const { EvolutionOptIn } = require("./optin");
const { canUploadTelemetry } = require("./telemetry-policy");

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
 * @returns {Promise<{ sent: boolean, reason?: string, policy?: object }>}
 */
async function uploadEvolutionOutcome(outcome, options = {}) {
  // Step 1: Entitlement gate (fail-closed)
  const entitlement = options._entitlementCheck || await authorizeEntitlement({ feature: "evolution_upload" });
  if (!entitlement.allowed) {
    return { sent: false, reason: `Entitlement check failed: ${entitlement.state}` };
  }

  // Step 2: Check "evolution_upload" feature
  // Step 3: User opt-in (fail-closed: default OFF)
  const optIn = options._optIn || new EvolutionOptIn();
  const policy = canUploadTelemetry(entitlement, optIn.isEnabled());
  if (!policy.allowed) {
    return { sent: false, reason: `evolution_upload: ${policy.reason || "not authorized"}`, policy: policy.policy };
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
  let parsedServerUrl;
  try {
    parsedServerUrl = new URL(serverUrl);
    if (parsedServerUrl.protocol !== "https:") throw new Error("HTTPS is required");
    if (parsedServerUrl.username || parsedServerUrl.password || parsedServerUrl.search || parsedServerUrl.hash) throw new Error("Server URL is invalid");
  } catch {
    return { sent: false, reason: "Server URL must be a valid HTTPS URL" };
  }

  // Step 6: Network request (ONLY after all checks pass)
  const httpPost = options._httpPost || _defaultHttpPost;
  try {
    const response = await httpPost(
      parsedServerUrl.origin + parsedServerUrl.pathname.replace(/\/+$/, "") + "/v1/evolution/telemetry",
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
  const { postJson } = require("../core/http");
  return postJson(urlString, JSON.stringify(body), 10000, headers);
}

module.exports = { uploadEvolutionOutcome };
