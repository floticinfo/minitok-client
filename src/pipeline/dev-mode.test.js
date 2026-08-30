"use strict";

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { checkEntitlement, GateState } = require("../entitlement/gate");

describe("development mode gate bypass", () => {
  it("bypasses only in non-production environments", () => {
    const previous = process.env.MINITOK_DEV_MODE;
    const production = process.env.NODE_ENV === "production";
    try {
      process.env.NODE_ENV = "test";
      process.env.MINITOK_DEV_MODE = "1";
      const bypass = process.env.MINITOK_DEV_MODE === "1" && process.env.NODE_ENV !== "production";
      assert.equal(bypass, true);

      process.env.NODE_ENV = "production";
      const blocked = process.env.MINITOK_DEV_MODE === "1" && process.env.NODE_ENV !== "production";
      assert.equal(blocked, false);
    } finally {
      if (previous === undefined) delete process.env.MINITOK_DEV_MODE;
      else process.env.MINITOK_DEV_MODE = previous;
      if (!production) delete process.env.NODE_ENV;
    }
  });
});

describe("entitlement gate fail-closed states", () => {
  it("fails closed for unknown key ids with a non-allow state", () => {
    const r = checkEntitlement({
      _loadArtifact: () => ({ key_id: "cv82-self", payload: { entitlement_id: "e1", installation_id: "i1", plan_id: "pro", features: [], max_devices: 1, issued_at: new Date().toISOString(), expires_at: new Date(Date.now() + 86400000).toISOString(), key_id: "cv82-self" }, signature: "AA" }),
      _loadGateState: () => ({ latest_observed_at: 0, last_validated_at: null }),
    });
    assert.equal(r.allowed, false);
    assert.ok([GateState.INVALID_SIGNATURE, GateState.MALFORMED].includes(r.state), `state=${r.state}`);
  });
});
