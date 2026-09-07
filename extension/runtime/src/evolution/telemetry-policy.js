"use strict";

const PLAN_POLICIES = {
  open: { mode: "per_run", retention_days: 30, requires_consent: true },
  select: { mode: "aggregate_only", retention_days: 14, requires_consent: true },
  private: { mode: "none", retention_days: 0, requires_consent: false },
};

function getTelemetryPolicy(planId) {
  return PLAN_POLICIES[planId] || { mode: "none", retention_days: 0, requires_consent: true };
}

function getPlanId(entitlement) {
  return entitlement?.entitlement?.plan_id || entitlement?.payload?.plan_id || entitlement?.plan_id || null;
}

function canUploadTelemetry(entitlement, consented) {
  const policy = getTelemetryPolicy(getPlanId(entitlement));
  if (policy.mode === "none") return { allowed: false, policy, reason: "Telemetry is disabled for this plan" };
  if (policy.requires_consent && !consented) return { allowed: false, policy, reason: "Privacy consent not granted" };
  return { allowed: true, policy };
}

module.exports = { PLAN_POLICIES, getTelemetryPolicy, getPlanId, canUploadTelemetry };
