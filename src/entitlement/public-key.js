"use strict";

/**
 * Public Key Infrastructure — Ed25519 key registry with rotation support.
 *
 * This module manages the public keys used for entitlement signature
 * verification. It supports multiple concurrent keys for rotation.
 *
 * IMPORTANT: This file contains ONLY public keys. No private key material
 * must ever be present in this file or anywhere in the npm package.
 */

const crypto = require("crypto");

/**
 * Registry of known public keys.
 * Each entry maps a key_id to its PEM-encoded Ed25519 public key.
 *
 * For key rotation: add a new key_id entry. The old entry remains
 * valid for verifying existing entitlements. Remove old entries
 * only after all entitlements signed with that key have expired.
 *
 * To generate a test key pair (for tests only):
 *   const kp = crypto.generateKeyPairSync("ed25519");
 *   const pub = kp.publicKey.export({ type: "spki", format: "pem" });
 *
 * @type {Map<string, string>}
 */
const KEY_REGISTRY = new Map();

// ── Production public keys ──────────────────────────────────────
// These are the Ed25519 public keys used by the minitok production
// server to sign entitlements. The client uses these to verify
// entitlement signatures locally.
//
// For key rotation: add a new entry with a new key_id. Keep old
// entries until all entitlements signed with that key have expired.
// NEVER remove an entry that may still be referenced by active entitlements.

// Production key — key-2024-01-prod (server ED25519_KEY_ID)
KEY_REGISTRY.set(
  "key-2024-01-prod",
  "-----BEGIN PUBLIC KEY-----\nMCowBQYDK2VwAyEAGFySMKL6eeHvyQ/XdCe7c0OmdHxHf/RHz/Hp1BB3f1c=\n-----END PUBLIC KEY-----"
);

/**
 * Register a public key. Used internally and for testing.
 *
 * @param {string} keyId
 * @param {string} publicKeyPem - PEM-encoded Ed25519 public key
 */
function registerKey(keyId, publicKeyPem) {
  if (typeof keyId !== "string" || keyId.length === 0) {
    throw new Error("keyId must be a non-empty string");
  }
  if (typeof publicKeyPem !== "string" || publicKeyPem.length === 0) {
    throw new Error("publicKeyPem must be a non-empty string");
  }
  // Validate it's a real Ed25519 public key
  try {
    crypto.createPublicKey(publicKeyPem);
  } catch (e) {
    throw new Error(`Invalid public key for ${keyId}: ${e.message}`);
  }
  KEY_REGISTRY.set(keyId, publicKeyPem);
}

/**
 * Get a public key by key_id.
 *
 * @param {string} keyId
 * @returns {string | null} PEM-encoded public key, or null if not found
 */
function getPublicKey(keyId) {
  return KEY_REGISTRY.get(keyId) || null;
}

/**
 * Check if a key_id is registered.
 *
 * @param {string} keyId
 * @returns {boolean}
 */
function hasKey(keyId) {
  return KEY_REGISTRY.has(keyId);
}

/**
 * Remove a key from the registry.
 *
 * @param {string} keyId
 * @returns {boolean} true if the key was present
 */
function removeKey(keyId) {
  return KEY_REGISTRY.delete(keyId);
}

/**
 * Get all registered key IDs.
 *
 * @returns {string[]}
 */
function listKeys() {
  return Array.from(KEY_REGISTRY.keys());
}

/**
 * Clear all registered keys.
 */
function clearKeys() {
  KEY_REGISTRY.clear();
}

module.exports = {
  registerKey,
  getPublicKey,
  hasKey,
  removeKey,
  listKeys,
  clearKeys,
  KEY_REGISTRY,
};
