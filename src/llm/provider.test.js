"use strict";

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { createProvider } = require("./provider");

describe("generic custom provider", () => {
  it("supports arbitrary provider names and endpoint aliases", async () => {
    const provider = createProvider("any-provider", { endpoint: "https://example.test/v1", auth: { type: "api_key", key: "key", scheme: "raw", header: "X-Token" }, models: [{ id: "model" }] });
    assert.equal(provider.name, "any-provider");
    assert.equal(provider.baseUrl, "https://example.test/v1");
    const auth = await provider._resolveAuth();
    assert.equal(auth.headers["x-api-key"], "key");
  });
});
