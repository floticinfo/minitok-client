"use strict";

/**
 * PrivacyConsent — formal abstraction for privacy consent.
 *
 * Strictly separates privacy consent from entitlement.
 * Consent state: UNKNOWN | OFF | ON
 * Default: OFF (fail-closed).
 *
 * This is a wrapper around EvolutionOptIn that provides
 * a policy-level abstraction independent of entitlement.
 */
class PrivacyConsent {
  /**
   * @param {object} [options]
   * @param {import('./optin').EvolutionOptIn} [options.optIn] - EvolutionOptIn instance
   */
  constructor(options = {}) {
    const { EvolutionOptIn } = require("./optin");
    this._optIn = options.optIn || new EvolutionOptIn();
  }

  /**
   * Check if privacy consent is granted for telemetry.
   * Returns TRUE only when explicitly enabled.
   * Unknown/broken state → FALSE (fail-closed).
   * @returns {boolean}
   */
  isTelemetryConsented() {
    return this._optIn.isEnabled() === true;
  }

  /**
   * Get detailed consent state.
   * @returns {{ consented: boolean, state: string, detail: string }}
   */
  status() {
    try {
      const enabled = this._optIn.isEnabled();
      if (enabled) {
        return { consented: true, state: "ON", detail: "Privacy consent explicitly granted" };
      }
      return { consented: false, state: "OFF", detail: "Privacy consent not granted (default)" };
    } catch {
      return { consented: false, state: "UNKNOWN", detail: "Privacy consent state could not be determined (fail-closed)" };
    }
  }

  /**
   * Grant privacy consent for telemetry.
   */
  grant() {
    this._optIn.enable();
  }

  /**
   * Revoke privacy consent for telemetry.
   */
  revoke() {
    this._optIn.disable();
  }

  /**
   * Static check: is telemetry allowed given entitlement + consent?
   * This enforces the rule: entitlement does NOT imply consent.
   *
   * @param {object} entitlement - Result from checkEntitlement()
   * @param {PrivacyConsent} consent - PrivacyConsent instance
   * @param {string} [featureName] - Required feature name (default: "evolution_upload")
   * @returns {{ allowed: boolean, reason?: string }}
   */
  static evaluateTelemetryPolicy(entitlement, consent, featureName = "evolution_upload") {
    // 1. Entitlement must exist and be valid
    if (!entitlement || !entitlement.allowed) {
      return { allowed: false, reason: `Entitlement not valid: ${entitlement?.state || "MISSING"}` };
    }

    // 2. Required feature must be present
    const features = entitlement.entitlement?.features || [];
    if (!features.includes(featureName)) {
      return { allowed: false, reason: `Feature '${featureName}' not in entitlement` };
    }

    // 3. Privacy consent must be explicitly granted (fail-closed)
    if (!consent || !consent.isTelemetryConsented()) {
      return { allowed: false, reason: "Privacy consent not granted" };
    }

    return { allowed: true };
  }
}

module.exports = { PrivacyConsent };
