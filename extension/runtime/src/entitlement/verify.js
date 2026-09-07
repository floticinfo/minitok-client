"use strict";

/**
 * Entitlement Verification — Ed25519 signature verification and state evaluation.
 *
 * Verifies entitlement artifacts using Node.js native crypto.
 * Returns structured results rather than throwing for normal invalid states.
 *
 * PHASE 13: Adds installation binding check.
 * After cryptographic verification, the entitlement payload's installation_id
 * is compared against the local installation identity. If they differ,
 * the entitlement is considered invalid (INSTALLATION_MISMATCH).
 */

const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const os = require("os");
const { validateArtifact, canonicalize } = require("./model");
const { getPublicKey } = require("./public-key");

/**
 * Entitlement verification states.
 */
const EntitlementState = Object.freeze({
  VALID: "VALID",
  EXPIRED: "EXPIRED",
  INVALID_SIGNATURE: "INVALID_SIGNATURE",
  MALFORMED: "MALFORMED",
  MISSING: "MISSING",
  INSTALLATION_MISMATCH: "INSTALLATION_MISMATCH", // PHASE 13
});

/**
 * Load the local installation identity from installation-token.json.
 * @param {string} [entitlementDir] - Override entitlement storage dir
 * @returns {string|null} installation_id or null if not found
 */
function loadLocalInstallationId(entitlementDir) {
  const dir = entitlementDir || path.join(os.homedir(), ".minitok", "entitlement");
  const tokenFile = path.join(dir, "installation-token.json");
  try {
    const data = fs.readFileSync(tokenFile, "utf-8");
    const parsed = JSON.parse(data);
    if (parsed && typeof parsed === "object" && parsed.installation_id) {
      return parsed.installation_id;
    }
  } catch {
    // File not found or malformed
  }
  return null;
}

/**
 * Verify an entitlement artifact.
 *
 * @param {*} artifact - The complete entitlement artifact { payload, signature, key_id }
 * @param {Date} [now] - Current time (for testing). Defaults to new Date().
 * @param {object} [options] - Additional verification options
 * @param {string} [options.entitlementDir] - Directory for installation-token.json
 * @param {string} [options.installationId] - Explicit installation_id (bypasses file read)
 * @returns {{ valid: boolean, state: string, reason?: string, entitlement?: object, legacy?: boolean }}
 */
function verifyEntitlement(artifact, now, options = {}) {
  const currentTime = now || new Date();

  // MISSING
  if (artifact === null || artifact === undefined) {
    return { valid: false, state: EntitlementState.MISSING, reason: "No entitlement found" };
  }

  // MALFORMED — structure validation
  const structureCheck = validateArtifact(artifact);
  if (!structureCheck.valid) {
    return { valid: false, state: EntitlementState.MALFORMED, reason: structureCheck.reason };
  }

  const { payload, signature, key_id } = structureCheck;
  const isLegacy = structureCheck.legacy === true;

  // Check key exists
  const publicKeyPem = getPublicKey(key_id);
  if (!publicKeyPem) {
    return { valid: false, state: EntitlementState.INVALID_SIGNATURE, reason: `Unknown key_id: ${key_id}`, legacy: isLegacy };
  }

  // Verify Ed25519 signature
  const canonicalPayload = canonicalize(payload);
  let signatureValid;
  try {
    const signatureBuffer = Buffer.from(signature, "base64url");
    if (signatureBuffer.length !== 64) {
      return { valid: false, state: EntitlementState.INVALID_SIGNATURE, reason: "Invalid signature length", legacy: isLegacy };
    }
    const publicKeyObj = crypto.createPublicKey(publicKeyPem);
    signatureValid = crypto.verify(null, Buffer.from(canonicalPayload, "utf-8"), publicKeyObj, signatureBuffer);
  } catch (e) {
    return { valid: false, state: EntitlementState.INVALID_SIGNATURE, reason: `Signature verification error: ${e.message}`, legacy: isLegacy };
  }

  if (!signatureValid) {
    return { valid: false, state: EntitlementState.INVALID_SIGNATURE, reason: "Signature does not match payload", legacy: isLegacy };
  }

  // Check expiration
  const expiresAt = new Date(payload.expires_at).getTime();
  if (currentTime.getTime() >= expiresAt) {
    return { valid: false, state: EntitlementState.EXPIRED, reason: `Entitlement expired at ${payload.expires_at}`, legacy: isLegacy, entitlement: payload };
  }

  // PHASE 13: Installation binding check
  // New-format entitlements have installation_id in the payload.
  // Old-format (legacy) entitlements skip this check but are flagged.
  if (!isLegacy && payload.installation_id) {
    const localId = options.installationId || loadLocalInstallationId(options.entitlementDir);
    if (!localId) {
      return {
        valid: false,
        state: EntitlementState.INSTALLATION_MISMATCH,
        reason: "No local installation identity found. Run 'minitok activate' to register.",
        legacy: isLegacy,
      };
    }
    if (payload.installation_id !== localId) {
      return {
        valid: false,
        state: EntitlementState.INSTALLATION_MISMATCH,
        reason: "Entitlement installation binding mismatch: this entitlement was issued for a different installation.",
        legacy: isLegacy,
      };
    }
  }

  return { valid: true, state: EntitlementState.VALID, entitlement: payload, legacy: isLegacy };
}

module.exports = {
  verifyEntitlement,
  EntitlementState,
  loadLocalInstallationId,
};
