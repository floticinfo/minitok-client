"use strict";

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { loadCustomerToken, saveCustomerToken, removeCustomerToken } = require("./customer-token");

describe("customer token storage", () => {
  it("saves and loads an owner-only customer token", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "minitok-customer-token-"));
    const file = path.join(root, "customer-token.json");
    saveCustomerToken("jwt-value", file);
    assert.equal(loadCustomerToken(file), "jwt-value");
    removeCustomerToken(file);
    assert.equal(loadCustomerToken(file), null);
    fs.rmSync(root, { recursive: true, force: true });
  });

  it("prefers the explicit environment token", () => {
    const previous = process.env.minitok_customer_token;
    process.env.minitok_customer_token = "env-jwt";
    try { assert.equal(loadCustomerToken("missing.json"), "env-jwt"); } finally {
      if (previous === undefined) delete process.env.minitok_customer_token;
      else process.env.minitok_customer_token = previous;
    }
  });
});
