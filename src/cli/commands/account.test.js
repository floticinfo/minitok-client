"use strict";
const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { saveAccountSession, loadAccountSession, removeAccountSession } = require("./account");

describe("account session storage", () => {
  it("stores and removes account credentials without printing them", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "minitok-account-"));
    const file = path.join(root, "session.json");
    saveAccountSession({ access_token: "jwt", refresh_token: "refresh", expires_in: 60 }, file);
    assert.equal(loadAccountSession(file).access_token, "jwt");
    removeAccountSession(file);
    assert.equal(loadAccountSession(file), null);
    fs.rmSync(root, { recursive: true, force: true });
  });
});
