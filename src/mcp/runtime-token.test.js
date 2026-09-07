"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { rotateRuntimeToken, readRuntimeToken, revokeRuntimeToken } = require("./runtime-token");

test("runtime tokens rotate independently and bind to installation", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "minitok-runtime-token-"));
  const entitlementDir = path.join(root, "entitlement");
  const filePath = path.join(root, "mcp", "runtime-token.json");
  fs.mkdirSync(entitlementDir, { recursive: true });
  fs.writeFileSync(path.join(entitlementDir, "installation-token.json"), JSON.stringify({ token: "installation-jwt", installation_id: "installation-a" }));
  try {
    const first = rotateRuntimeToken({ entitlementDir, filePath, now: 1000, ttlMs: 1000 });
    const second = rotateRuntimeToken({ entitlementDir, filePath, now: 1100, ttlMs: 1000 });
    assert.notEqual(first.token, second.token);
    assert.equal(readRuntimeToken(filePath, 1500).token, second.token);
    assert.equal(readRuntimeToken(filePath, 2100), null);
    fs.writeFileSync(path.join(entitlementDir, "installation-token.json"), JSON.stringify({ token: "installation-jwt", installation_id: "installation-b" }));
    assert.equal(readRuntimeToken(filePath, 1500), null);
    assert.equal(process.platform === "win32" || (fs.statSync(filePath).mode & 0o777) === 0o600, true);
    fs.writeFileSync(path.join(entitlementDir, "installation-token.json"), JSON.stringify({ token: "installation-jwt", installation_id: "installation-a" }));
    assert.equal(revokeRuntimeToken(filePath), true);
    assert.equal(readRuntimeToken(filePath, 1100), null);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("runtime token generation fails without an installation", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "minitok-runtime-token-missing-"));
  try {
    assert.throws(() => rotateRuntimeToken({ entitlementDir: root, filePath: path.join(root, "runtime-token.json") }), /active installation/);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
