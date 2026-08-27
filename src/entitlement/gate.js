"use strict";

/**
 * Entitlement Gate — deterministic runtime authorization.
 *
 * Loads the local entitlement, verifies it cryptographically,
 * checks expiration, offline grace, and clock rollback.
 * Returns a structured allow/block result independent of any LLM.
 */

const fs = require("fs");
const path = require("path");
const os = require("os");
const { EntitlementStore } = require("./store");
const { verifyEntitlement, EntitlementState } = require("./verify");
const { setOwnerOnlyPermissions } = require("../utils/file-permissions");

const OFFLINE_GRACE_DAYS = 30;
const OFFLINE_GRACE_MS = OFFLINE_GRACE_DAYS * 24 * 60 * 60 * 1000;
// P3-02: Reduced from 5 minutes to 30 seconds to minimize bypass window.
// Legitimate clock corrections (NTP, manual) are typically < 10 seconds.
const CLOCK_ROLLBACK_THRESHOLD_MS = 30 * 1000;

const GateState = Object.freeze({
  ALLOWED: "ALLOWED",
  MISSING: "MISSING",
  MALFORMED: "MALFORMED",
  INVALID_SIGNATURE: "INVALID_SIGNATURE",
  EXPIRED: "EXPIRED",
  OFFLINE_GRACE: "OFFLINE_GRACE",
  CLOCK_ROLLBACK: "CLOCK_ROLLBACK",
  INSTALLATION_MISMATCH: "INSTALLATION_MISMATCH", // PHASE 13
});

const GateMessages = Object.freeze({
  [GateState.ALLOWED]: "Entitlement verified. minitok is authorized.",
  [GateState.MISSING]: "minitok requires an active entitlement. Run 'minitok activate <your-license-key>' to activate.",
  [GateState.MALFORMED]: "Your local entitlement is corrupted or invalid. Run 'minitok activate <your-license-key>' to re-activate.",
  [GateState.INVALID_SIGNATURE]: "Your local entitlement is invalid. Run 'minitok activate <your-license-key>' to re-activate.",
  [GateState.EXPIRED]: "Your minitok entitlement has expired. Renew your subscription to continue.",
  [GateState.OFFLINE_GRACE]: "minitok is operating in offline grace mode.",
  [GateState.CLOCK_ROLLBACK]: "System clock appears to have been set back. Please correct your system clock.",
  [GateState.INSTALLATION_MISMATCH]: "This entitlement was issued for a different installation. Run 'minitok activate <your-license-key>' to activate on this machine.",
});

function _defaultEntitlementDir() {
  return path.join(os.homedir(), ".minitok", "entitlement");
}

function _stateFilePath(entitlementDir) {
  return path.join(entitlementDir || _defaultEntitlementDir(), "gate-state.json");
}

function loadGateState(entitlementDir) {
  const fp = _stateFilePath(entitlementDir);
  try {
    const data = fs.readFileSync(fp, "utf-8");
    const parsed = JSON.parse(data);
    return {
      latest_observed_at: typeof parsed.latest_observed_at === "number" ? parsed.latest_observed_at : 0,
      last_validated_at: typeof parsed.last_validated_at === "string" ? parsed.last_validated_at : null,
    };
  } catch {
    return { latest_observed_at: 0, last_validated_at: null };
  }
}

function saveGateState(state, entitlementDir) {
  const fp = _stateFilePath(entitlementDir);
  const dir = path.dirname(fp);
  fs.mkdirSync(dir, { recursive: true });
  const tmp = fp + ".tmp";
  fs.writeFileSync(tmp, JSON.stringify(state, null, 2), "utf-8", { mode: 0o600 });
  fs.renameSync(tmp, fp);
  // P3-01: Set owner-only permissions (POSIX + Windows ACL)
  setOwnerOnlyPermissions(fp);
}

function detectClockRollback(currentTimeMs, gateState) {
  return gateState.latest_observed_at > 0 && currentTimeMs < gateState.latest_observed_at - CLOCK_ROLLBACK_THRESHOLD_MS;
}

function updateMonotonicState(currentTimeMs, now, gateState) {
  const updated = { ...gateState };
  if (currentTimeMs > updated.latest_observed_at) updated.latest_observed_at = currentTimeMs;
  updated.last_validated_at = now.toISOString();
  return updated;
}

/**
 * Run the entitlement gate check.
 * @param {object} [options]
 * @param {string} [options.entitlementDir] - Override entitlement storage dir
 * @param {Date} [options.now] - Override current time (for testing)
 * @param {Function} [options._loadArtifact] - Override artifact loading (for testing)
 * @param {Function} [options._saveGateState] - Override state persistence (for testing)
 * @param {Function} [options._loadGateState] - Override state loading (for testing)
 * @returns {{ allowed: boolean, state: string, message: string, entitlement?: object, graceDaysRemaining?: number }}
 */
function checkEntitlement(options = {}) {
  const now = options.now || new Date();
  const currentTimeMs = now.getTime();
  const entitlementDir = options.entitlementDir;

  const loadState = options._loadGateState || (() => loadGateState(entitlementDir));
  const gateState = loadState();

  // Clock rollback detection
  if (detectClockRollback(currentTimeMs, gateState)) {
    return { allowed: false, state: GateState.CLOCK_ROLLBACK, message: GateMessages[GateState.CLOCK_ROLLBACK] };
  }

  // Load entitlement artifact
  const store = new EntitlementStore(entitlementDir);
  const artifact = options._loadArtifact ? options._loadArtifact() : store.load();

  // Cryptographic verification (includes installation binding for PHASE 13)
  const verification = verifyEntitlement(artifact, now, { entitlementDir });

  if (verification.state === EntitlementState.MISSING) {
    return { allowed: false, state: GateState.MISSING, message: GateMessages[GateState.MISSING] };
  }
  if (verification.state === EntitlementState.MALFORMED) {
    return { allowed: false, state: GateState.MALFORMED, message: GateMessages[GateState.MALFORMED] };
  }
  if (verification.state === EntitlementState.INVALID_SIGNATURE) {
    return { allowed: false, state: GateState.INVALID_SIGNATURE, message: GateMessages[GateState.INVALID_SIGNATURE] };
  }
  if (verification.state === EntitlementState.INSTALLATION_MISMATCH) {
    return { allowed: false, state: GateState.INSTALLATION_MISMATCH, message: GateMessages[GateState.INSTALLATION_MISMATCH] };
  }
  if (verification.state === EntitlementState.EXPIRED) {
    // Offline grace: last_validated_at within grace window?
    if (gateState.last_validated_at) {
      const lastValidatedMs = new Date(gateState.last_validated_at).getTime();
      const graceExpiryMs = lastValidatedMs + OFFLINE_GRACE_MS;
      if (currentTimeMs < graceExpiryMs) {
        // PHASE 13: Even during offline grace, installation binding must match.
        // For legacy entitlements (no installation_id), skip the binding check.
        if (!verification.legacy && verification.payload && verification.payload.installation_id) {
          const { loadLocalInstallationId } = require("./verify");
          const localId = loadLocalInstallationId(entitlementDir);
          if (!localId || verification.payload.installation_id !== localId) {
            return { allowed: false, state: GateState.INSTALLATION_MISMATCH, message: GateMessages[GateState.INSTALLATION_MISMATCH] };
          }
        }
        const daysRemaining = Math.ceil((graceExpiryMs - currentTimeMs) / (24 * 60 * 60 * 1000));
        return { allowed: true, state: GateState.OFFLINE_GRACE, message: `${GateMessages[GateState.OFFLINE_GRACE]} ${daysRemaining} day(s) remaining.`, entitlement: verification.entitlement, graceDaysRemaining: daysRemaining };
      }
    }
    return { allowed: false, state: GateState.EXPIRED, message: GateMessages[GateState.EXPIRED] };
  }
  if (verification.state === EntitlementState.VALID) {
    const saveState = options._saveGateState || ((s) => saveGateState(s, entitlementDir));
    const updated = updateMonotonicState(currentTimeMs, now, gateState);
    saveState(updated);
    return { allowed: true, state: GateState.ALLOWED, message: GateMessages[GateState.ALLOWED], entitlement: verification.entitlement };
  }

  // Unknown state — fail closed
  return { allowed: false, state: GateState.MALFORMED, message: GateMessages[GateState.MALFORMED] };
}

module.exports = {
  checkEntitlement, GateState, GateMessages,
  OFFLINE_GRACE_DAYS, OFFLINE_GRACE_MS, CLOCK_ROLLBACK_THRESHOLD_MS,
  loadGateState, saveGateState, detectClockRollback, updateMonotonicState,
};