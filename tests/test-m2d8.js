"use strict";

/**
 * M2.D8 Tests — Server URL configuration, activate command, status command.
 */

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const os = require("os");
const { EntitlementStore } = require("../src/entitlement/store");

// --- Server URL Configuration ---
const { resolveServerUrl, saveServerUrl, DEFAULT_SERVER_URL } = require("../src/cli/commands/server-config");

describe("M2.D8 — Server URL Configuration", () => {
  const origEnv = process.env.minitok_SERVER_URL;

  it("returns default when nothing configured", () => {
    delete process.env.minitok_SERVER_URL;
    const url = resolveServerUrl();
    assert.equal(url, DEFAULT_SERVER_URL);
  });

  it("respects minitok_SERVER_URL env", () => {
    process.env.minitok_SERVER_URL = "http://localhost:4000";
    const url = resolveServerUrl();
    assert.equal(url, "http://localhost:4000");
    delete process.env.minitok_SERVER_URL;
  });

  it("respects --server CLI flag", () => {
    process.env.minitok_SERVER_URL = "http://env.example.com";
    const url = resolveServerUrl({ cliServer: "http://cli.example.com:9999" });
    assert.equal(url, "http://cli.example.com:9999");
    delete process.env.minitok_SERVER_URL;
  });

  it("normalizes trailing slash", () => {
    const url = resolveServerUrl({ cliServer: "http://example.com/" });
    assert.equal(url, "http://example.com");
  });

  it("rejects malformed URL gracefully", () => {
    const url = resolveServerUrl({ cliServer: "not-a-url" });
    assert.equal(url, DEFAULT_SERVER_URL);
  });

  it("rejects ftp protocol gracefully", () => {
    const url = resolveServerUrl({ cliServer: "ftp://example.com" });
    assert.equal(url, DEFAULT_SERVER_URL);
  });
});

describe("M2.D8 — Activate Command (unit)", () => {
  it("cmdActivate rejects missing key", async () => {
    const { cmdActivate } = require("../src/cli/commands/activate");
    const exitCode = await cmdActivate(null, {});
    assert.equal(exitCode, 1);
  });

  it("cmdActivate rejects empty string key", async () => {
    const { cmdActivate } = require("../src/cli/commands/activate");
    const exitCode = await cmdActivate("", {});
    assert.equal(exitCode, 1);
  });

  it("cmdActivate fails gracefully when server unreachable", async () => {
    const { cmdActivate } = require("../src/cli/commands/activate");
    const exitCode = await cmdActivate("TEST-KEY-1234", {
      server: "http://127.0.0.1:19999",
    });
    assert.equal(exitCode, 1);
  });
});

describe("M2.D8 — Entitlement Store (round-trip)", () => {
  let tmpDir;

  it("save and load entitlement artifact", () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "m2d8-"));
    const store = new EntitlementStore(tmpDir);

    const artifact = {
      payload: { entitlement_id: "test", plan_id: "pro", features: [], max_devices: 3, issued_at: new Date().toISOString(), expires_at: "2030-01-01T00:00:00Z", key_id: "test-key" },
      signature: "test-sig",
      key_id: "test-key",
    };

    store.save(artifact);
    const loaded = store.load();
    assert.deepEqual(loaded.payload, artifact.payload);
    assert.equal(loaded.signature, "test-sig");
    assert.equal(loaded.key_id, "test-key");
  });

  it("returns null for missing entitlement", () => {
    const tmpDir2 = fs.mkdtempSync(path.join(os.tmpdir(), "m2d8-empty-"));
    const store = new EntitlementStore(tmpDir2);
    assert.equal(store.load(), null);
  });
});
