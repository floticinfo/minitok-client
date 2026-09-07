"use strict";

const assert = require("node:assert/strict");
const { describe, it } = require("node:test");
const { PLAN_POLICIES, getTelemetryPolicy, canUploadTelemetry } = require("./telemetry-policy");

describe("three-tier telemetry policy", () => {
  it("defines Open as consented per-run telemetry", () => {
    assert.deepEqual(PLAN_POLICIES.open, { mode: "per_run", retention_days: 30, requires_consent: true });
    assert.equal(canUploadTelemetry({ entitlement: { plan_id: "open" } }, true).allowed, true);
    assert.equal(canUploadTelemetry({ entitlement: { plan_id: "open" } }, false).allowed, false);
  });
  it("defines Select as consented aggregate-only telemetry", () => {
    assert.deepEqual(PLAN_POLICIES.select, { mode: "aggregate_only", retention_days: 14, requires_consent: true });
    assert.equal(canUploadTelemetry({ entitlement: { plan_id: "select" } }, true).policy.mode, "aggregate_only");
  });
  it("defines Private as no telemetry", () => {
    assert.equal(getTelemetryPolicy("private").mode, "none");
    assert.equal(canUploadTelemetry({ entitlement: { plan_id: "private" } }, true).allowed, false);
  });
  it("fails closed for unknown plans", () => {
    assert.equal(getTelemetryPolicy("unknown").mode, "none");
    assert.equal(canUploadTelemetry({ entitlement: { plan_id: "unknown" } }, true).allowed, false);
  });
});
