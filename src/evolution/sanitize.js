"use strict";

/**
 * Evolution Sanitizer — strict allowlist-based payload sanitization.
 *
 * ONLY allows numeric/enum fields that contain zero project data.
 * Free-form text fields (goal, summary, etc.) are explicitly DENIED.
 *
 * Design principle: ALLOWLIST ONLY. Unknown fields → REJECT.
 */

/** @type {Record<string, { type: string, required: boolean, min?: number, max?: number, values?: string[] }>} */
const ALLOWED_FIELDS = {
  status:           { type: "enum", required: true, values: ["success", "failure", "partial"] },
  cycles:           { type: "integer", required: true, min: 0, max: 100 },
  duration_ms:      { type: "integer", required: true, min: 0, max: 3_600_000 },
  files_changed:    { type: "integer", required: true, min: 0, max: 1000 },
  total_tokens:     { type: "integer", required: false, min: 0, max: 10_000_000 },
  failure_category: { type: "enum", required: false, values: ["lint", "test", "validation", "timeout", "api_error", "unknown"] },
};

/**
 * Sanitize a raw EvolutionOutcome into a server-safe telemetry payload.
 *
 * @param {object} outcome - raw outcome from KnowledgeStore.record()
 * @returns {{ ok: boolean, payload?: object, reason?: string }}
 */
function sanitizeEvolutionOutcome(outcome) {
  if (!outcome || typeof outcome !== "object" || Array.isArray(outcome)) {
    return { ok: false, reason: "Outcome must be a non-null object" };
  }

  // Strict allowlist: reject if ANY unknown field exists
  const allowedKeys = new Set(Object.keys(ALLOWED_FIELDS));
  for (const key of Object.keys(outcome)) {
    if (!allowedKeys.has(key)) {
      return { ok: false, reason: `Forbidden field: ${key}` };
    }
  }

  const result = {};

  for (const [field, spec] of Object.entries(ALLOWED_FIELDS)) {
    const value = outcome[field];

    if (value === undefined || value === null) {
      if (spec.required) {
        return { ok: false, reason: `Missing required field: ${field}` };
      }
      continue; // optional field, skip
    }

    if (spec.type === "enum") {
      if (typeof value !== "string" || !spec.values.includes(value)) {
        return { ok: false, reason: `Invalid value for ${field}: ${JSON.stringify(value)}` };
      }
      result[field] = value;
    } else if (spec.type === "integer") {
      if (typeof value !== "number" || !Number.isInteger(value)) {
        return { ok: false, reason: `Field ${field} must be an integer` };
      }
      if (value < spec.min || value > spec.max) {
        return { ok: false, reason: `Field ${field} out of range [${spec.min}, ${spec.max}]: ${value}` };
      }
      result[field] = value;
    }
  }

  return { ok: true, payload: result };
}

module.exports = { sanitizeEvolutionOutcome, ALLOWED_FIELDS };