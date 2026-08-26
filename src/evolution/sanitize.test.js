"use strict";
const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { sanitizeEvolutionOutcome } = require("./sanitize");

const VALID = { status: "success", cycles: 3, duration_ms: 12345, files_changed: 4, total_tokens: 12000, failure_category: "test" };

describe("Sanitizer - valid", () => {
  it("minimal", () => { const r = sanitizeEvolutionOutcome({ status: "success", cycles: 1, duration_ms: 100, files_changed: 1 }); assert.equal(r.ok, true); assert.equal(r.payload.total_tokens, undefined); });
  it("full", () => assert.equal(sanitizeEvolutionOutcome(VALID).ok, true));
  it("boundary min", () => assert.equal(sanitizeEvolutionOutcome({ status: "success", cycles: 0, duration_ms: 0, files_changed: 0 }).ok, true));
  it("boundary max", () => assert.equal(sanitizeEvolutionOutcome({ status: "success", cycles: 100, duration_ms: 3600000, files_changed: 1000, total_tokens: 10000000 }).ok, true));
  it("all status enums", () => { for (const s of ["success", "failure", "partial"]) assert.equal(sanitizeEvolutionOutcome({ status: s, cycles: 1, duration_ms: 100, files_changed: 1 }).ok, true); });
  it("all failure_category enums", () => { for (const fc of ["lint", "test", "validation", "timeout", "api_error", "unknown"]) assert.equal(sanitizeEvolutionOutcome({ status: "failure", cycles: 1, duration_ms: 100, files_changed: 1, failure_category: fc }).ok, true); });
});

describe("Sanitizer - reject unknown fields", () => {
  const cases = [
    ["goal", { goal: "CANARY" }], ["summary", { summary: "CANARY" }],
    ["source_code", { source_code: "CANARY" }], ["file_path", { file_path: "/x" }],
    ["file_name", { file_name: "x.js" }], ["project_name", { project_name: "x" }],
    ["repository_name", { repository_name: "x" }], ["command_output", { command_output: "x" }],
    ["observation", { observation: "x" }], ["knowledge", { knowledge: "x" }],
    ["diff", { diff: "+x" }], ["prompt", { prompt: "x" }],
    ["llm_request", { llm_request: {} }], ["llm_response", { llm_response: {} }],
    ["error_message", { error_message: "x" }],
  ];
  for (const [field, extra] of cases) {
    it("rejects " + field, () => { const r = sanitizeEvolutionOutcome({ status: "success", cycles: 1, duration_ms: 100, files_changed: 1, ...extra }); assert.equal(r.ok, false); assert.match(r.reason, /Forbidden field/); });
  }
  it("rejects metadata", () => assert.equal(sanitizeEvolutionOutcome({ status: "success", cycles: 1, duration_ms: 100, files_changed: 1, metadata: {} }).ok, false));
  it("rejects unknown foo", () => assert.equal(sanitizeEvolutionOutcome({ ...VALID, foo: "bar" }).ok, false));
});

describe("Sanitizer - reject invalid values", () => {
  it("invalid status", () => assert.equal(sanitizeEvolutionOutcome({ status: "pending", cycles: 1, duration_ms: 100, files_changed: 1 }).ok, false));
  it("invalid failure_category", () => assert.equal(sanitizeEvolutionOutcome({ status: "failure", cycles: 1, duration_ms: 100, files_changed: 1, failure_category: "crash" }).ok, false));
  it("cycles > max", () => assert.equal(sanitizeEvolutionOutcome({ status: "success", cycles: 101, duration_ms: 100, files_changed: 1 }).ok, false));
  it("negative cycles", () => assert.equal(sanitizeEvolutionOutcome({ status: "success", cycles: -1, duration_ms: 100, files_changed: 1 }).ok, false));
  it("duration > max", () => assert.equal(sanitizeEvolutionOutcome({ status: "success", cycles: 1, duration_ms: 3600001, files_changed: 1 }).ok, false));
  it("files > max", () => assert.equal(sanitizeEvolutionOutcome({ status: "success", cycles: 1, duration_ms: 100, files_changed: 1001 }).ok, false));
  it("tokens > max", () => assert.equal(sanitizeEvolutionOutcome({ status: "success", cycles: 1, duration_ms: 100, files_changed: 1, total_tokens: 10000001 }).ok, false));
  it("float cycles", () => assert.equal(sanitizeEvolutionOutcome({ status: "success", cycles: 1.5, duration_ms: 100, files_changed: 1 }).ok, false));
  it("string cycles", () => assert.equal(sanitizeEvolutionOutcome({ status: "success", cycles: "3", duration_ms: 100, files_changed: 1 }).ok, false));
  it("null cycles", () => assert.equal(sanitizeEvolutionOutcome({ status: "success", cycles: null, duration_ms: 100, files_changed: 1 }).ok, false));
  it("Infinity duration", () => assert.equal(sanitizeEvolutionOutcome({ status: "success", cycles: 1, duration_ms: Infinity, files_changed: 1 }).ok, false));
});

describe("Sanitizer - reject malformed", () => {
  it("null", () => assert.equal(sanitizeEvolutionOutcome(null).ok, false));
  it("undefined", () => assert.equal(sanitizeEvolutionOutcome(undefined).ok, false));
  it("array", () => assert.equal(sanitizeEvolutionOutcome([]).ok, false));
  it("string", () => assert.equal(sanitizeEvolutionOutcome("hello").ok, false));
  it("missing status", () => assert.equal(sanitizeEvolutionOutcome({ cycles: 1, duration_ms: 100, files_changed: 1 }).ok, false));
  it("missing cycles", () => assert.equal(sanitizeEvolutionOutcome({ status: "success", duration_ms: 100, files_changed: 1 }).ok, false));
  it("missing duration_ms", () => assert.equal(sanitizeEvolutionOutcome({ status: "success", cycles: 1, files_changed: 1 }).ok, false));
  it("missing files_changed", () => assert.equal(sanitizeEvolutionOutcome({ status: "success", cycles: 1, duration_ms: 100 }).ok, false));
});
