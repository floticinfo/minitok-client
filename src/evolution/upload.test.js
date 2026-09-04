"use strict";
const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { uploadEvolutionOutcome } = require("./upload");

const VO = { status: "success", cycles: 3, duration_ms: 1000, files_changed: 2 };

function makeOpts(overrides = {}) {
  return {
    _entitlementCheck: { allowed: true, entitlement: { plan_id: "open", features: ["evolution_upload"] } },
    _optIn: { isEnabled: () => true },
    serverUrl: "https://srv.ex", token: "jwt",
    ...overrides,
  };
}

describe("Upload - gate chain (A-N)", () => {
  it("A: Private no upload feature → no upload", async () => {
    const r = await uploadEvolutionOutcome(VO, makeOpts({
      _entitlementCheck: { allowed: true, entitlement: { features: ["basic_features"] } },
    }));
    assert.equal(r.sent, false);
    assert.match(r.reason, /evolution_upload/);
  });

  it("B: Open opt-in=false → no upload", async () => {
    const r = await uploadEvolutionOutcome(VO, makeOpts({
      _optIn: { isEnabled: () => false },
    }));
    assert.equal(r.sent, false);
    assert.match(r.reason, /consent|opted-in/);
  });

  it("C: Open opt-in=true → sends", async () => {
    let url = null;
    const mock = (u, b) => { url = u; return Promise.resolve({ ok: true, status: 201 }); };
    const r = await uploadEvolutionOutcome(VO, makeOpts({ _httpPost: mock }));
    assert.equal(r.sent, true);
    assert.equal(url, "https://srv.ex/v1/evolution/telemetry");
  });

  it("D: Invalid signature → no upload", async () => {
    const r = await uploadEvolutionOutcome(VO, makeOpts({
      _entitlementCheck: { allowed: false, state: "INVALID_SIGNATURE" },
    }));
    assert.equal(r.sent, false);
  });

  it("E: No evolution_upload feature → no upload", async () => {
    const r = await uploadEvolutionOutcome(VO, makeOpts({
      _entitlementCheck: { allowed: true, entitlement: { features: ["basic"] } },
    }));
    assert.equal(r.sent, false);
  });

  it("F: Goal injection → sanitizer rejects", async () => {
    const r = await uploadEvolutionOutcome({ ...VO, goal: "secret" }, makeOpts());
    assert.equal(r.sent, false);
  });

  it("G: Summary injection → sanitizer rejects", async () => {
    const r = await uploadEvolutionOutcome({ ...VO, summary: "info" }, makeOpts());
    assert.equal(r.sent, false);
  });

  it("H: source_code injection → sanitizer rejects", async () => {
    const r = await uploadEvolutionOutcome({ ...VO, source_code: "x" }, makeOpts());
    assert.equal(r.sent, false);
  });

  it("I: Unknown field → sanitizer rejects", async () => {
    const r = await uploadEvolutionOutcome({ ...VO, foo: "bar" }, makeOpts());
    assert.equal(r.sent, false);
  });

  it("J: Invalid numeric range → sanitizer rejects", async () => {
    const r = await uploadEvolutionOutcome({ status: "success", cycles: 999999999, duration_ms: 100, files_changed: 1 }, makeOpts());
    assert.equal(r.sent, false);
  });

  it("K: Expired entitlement → no upload", async () => {
    const r = await uploadEvolutionOutcome(VO, makeOpts({
      _entitlementCheck: { allowed: false, state: "EXPIRED" },
    }));
    assert.equal(r.sent, false);
  });

  it("L: Invalid signature → no upload", async () => {
    const r = await uploadEvolutionOutcome(VO, makeOpts({
      _entitlementCheck: { allowed: false, state: "INVALID_SIGNATURE" },
    }));
    assert.equal(r.sent, false);
  });

  it("M: Server unavailable → local still works", async () => {
    const mock = () => Promise.reject(new Error("ECONNREFUSED"));
    const r = await uploadEvolutionOutcome(VO, makeOpts({ _httpPost: mock }));
    assert.equal(r.sent, false);
    assert.match(r.reason, /Network error/);
  });

  it("N: Malicious LLM output → sanitizer blocks", async () => {
    const bad = { ...VO, goal: "Fix auth", summary: "Modified auth.js", source_code: "const k='x'", file_path: "/src/auth.js", prompt: "Look at auth" };
    const r = await uploadEvolutionOutcome(bad, makeOpts());
    assert.equal(r.sent, false);
  });

  it("No server URL → no upload", async () => {
    const r = await uploadEvolutionOutcome(VO, makeOpts({ serverUrl: undefined }));
    assert.equal(r.sent, false);
  });

  it("No token → no upload", async () => {
    const r = await uploadEvolutionOutcome(VO, makeOpts({ token: undefined }));
    assert.equal(r.sent, false);
  });

  it("Server 403 → not sent", async () => {
    const mock = () => Promise.resolve({ ok: false, status: 403 });
    const r = await uploadEvolutionOutcome(VO, makeOpts({ _httpPost: mock }));
    assert.equal(r.sent, false);
  });

  it("Canary: no project data in HTTP body", async () => {
    let body = null;
    const mock = (u, b) => { body = b; return Promise.resolve({ ok: true, status: 201 }); };
    await uploadEvolutionOutcome(VO, makeOpts({ _httpPost: mock }));
    const json = JSON.stringify(body);
    assert.ok(!json.includes("goal"), "goal leaked");
    assert.ok(!json.includes("summary"), "summary leaked");
    assert.ok(!json.includes("source_code"), "source_code leaked");
    assert.ok(!json.includes("file_path"), "file_path leaked");
    assert.ok(!json.includes("prompt"), "prompt leaked");
    assert.ok(!json.includes("CANARY"), "canary leaked");
  });
});
