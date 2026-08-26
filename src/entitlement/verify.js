"use strict";

/**
 * Entitlement Verification — Ed25519 signature verification and state evaluation.
 *
 * Verifies entitlement artifacts using Node.js native crypto.
 * Returns structured results rather than throwing for normal invalid states.
 */

const crypto = require("crypto");
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
});

/**
 * Verify an entitlement artifact.
 *
 * @param {*} artifact - The complete entitlement artifact { payload, signature, key_id }
 * @param {Date} [now] - Current time (for testing). Defaults to new Date().
 * @returns {{ valid: boolean, state: string, reason?: string, entitlement?: object }}
 */
function verifyEntitlement(artifact, now) {
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

  // Check key exists
  const publicKeyPem = getPublicKey(key_id);
  if (!publicKeyPem) {
    return { valid: false, state: EntitlementState.INVALID_SIGNATURE, reason: `Unknown key_id: ${key_id}` };
  }

  // Verify Ed25519 signature
  const canonicalPayload = canonicalize(payload);
  let signatureValid;
  try {
    const signatureBuffer = Buffer.from(signature, "base64url");
    if (signatureBuffer.length !== 64) {
      return { valid: false, state: EntitlementState.INVALID_SIGNATURE, reason: "Invalid signature length" };
    }
    const publicKeyObj = crypto.createPublicKey(publicKeyPem);
    signatureValid = crypto.verify(null, Buffer.from(canonicalPayload, "utf-8"), publicKeyObj, signatureBuffer);
  } catch (e) {
    return { valid: false, state: EntitlementState.INVALID_SIGNATURE, reason: `Signature verification error: ${e.message}` };
  }

  if (!signatureValid) {
    return { valid: false, state: EntitlementState.INVALID_SIGNATURE, reason: "Signature does not match payload" };
  }

  // Check expiration
  const expiresAt = new Date(payload.expires_at).getTime();
  if (currentTime.getTime() >= expiresAt) {
    return { valid: false, state: EntitlementState.EXPIRED, reason: `Entitlement expired at ${payload.expires_at}` };
  }

  return { valid: true, state: EntitlementState.VALID, entitlement: payload };
}

module.exports = {
  verifyEntitlement,
  EntitlementState,
};
