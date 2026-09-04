"use strict";

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { fetchWithTimeout } = require("./provider");

function response(status, retryAfter) {
  return { ok: false, status, headers: { get: (name) => name === "retry-after" ? retryAfter : null }, arrayBuffer: async () => new ArrayBuffer(0) };
}

describe("Retry-After ceiling", () => {
  it("never sleeps longer than maxBackoffMs despite a huge server Retry-After", async () => {
    let calls = 0;
    const original = global.fetch;
    global.fetch = async () => { calls++; return response(429, "86400"); };
    const started = Date.now();
    try {
      const result = await fetchWithTimeout("https://example.test", {}, 1000, { maxRetries: 1, backoffMs: 5, maxBackoffMs: 20 });
      assert.equal(result.status, 429);
      assert.equal(calls, 2);
      assert.ok(Date.now() - started < 500, "Retry-After must be capped, not sleep for 24 hours");
    } finally {
      global.fetch = original;
    }
  });
});
