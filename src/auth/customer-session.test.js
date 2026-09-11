"use strict";

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { normalizeCustomerSession, isCustomerSession } = require("./customer-session");

describe("customer session contract", () => {
  it("normalizes snake_case server responses", () => {
    const session = normalizeCustomerSession({ access_token: "access", refresh_token: "refresh", expires_in: 60 });
    assert.equal(session.token_type, "Bearer");
    assert.equal(session.access_token, "access");
    assert.equal(session.refresh_token, "refresh");
    assert.ok(session.expires_at);
  });

  it("normalizes internal camelCase responses", () => {
    const session = normalizeCustomerSession({ accessToken: "access", refreshToken: "refresh", tokenType: "Bearer", expiresIn: 120 });
    assert.equal(session.expires_in, 120);
    assert.equal(isCustomerSession(session), true);
  });

  it("rejects incomplete sessions", () => {
    assert.equal(normalizeCustomerSession({ access_token: "access" }), null);
    assert.equal(isCustomerSession(null), false);
  });
});
