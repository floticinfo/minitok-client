"use strict";

const { describe, it, beforeEach, afterEach } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const os = require("os");
const path = require("path");
const crypto = require("crypto");
const { checkEntitlementOnline } = require("./online");
const { GateState, OFFLINE_GRACE_DAYS, loadGateState, saveGateState } = require("./gate");
const pubKey = require("./public-key");

function genKeyPair() {
  const kp = crypto.generateKeyPairSync("ed25519");
  return {
    privateKeyPem: kp.privateKey.export({ type: "pkcs8", format: "pem" }),
    publicKeyPem: kp.publicKey.export({ type: "spki", format: "pem" }),
  };
}

function signEntitlement({ privateKeyPem, keyId, payload }) {
  const canonical = require("./model").canonicalize(payload);
  const sig = crypto.sign(null, Buffer.from(canonical, "utf-8"), crypto.createPrivateKey(privateKeyPem));
  return { payload, signature: sig.toString("base64url"), key_id: keyId };
}

function tmpDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "mt-grace-"));
}

let dir, kp;
beforeEach(() => {
  pubKey.clearKeys();
  kp = genKeyPair();
  pubKey.registerKey("k1", kp.publicKeyPem);
  dir = tmpDir();
});
afterEach(() => {
  pubKey.clearKeys();
  fs.rmSync(dir, { recursive: true, force: true });
});

function makeEntitlement(installationId) {
  const now = new Date();
  return signEntitlement({
    privateKeyPem: kp.privateKeyPem,
    keyId: "k1",
    payload: {
      entitlement_id: "11111111-1111-4111-8111-111111111111",
      installation_id: installationId,
      plan_id: "open",
      features: ["autonomous_run"],
      max_devices: 1,
      issued_at: now.toISOString(),
      expires_at: new Date(now.getTime() + 30 * 86400000).toISOString(),
      key_id: "k1",
    },
  });
}

function seedValidEntitlement() {
  const installationId = "22222222-2222-4222-8222-222222222222";
  fs.writeFileSync(path.join(dir, "entitlement.json"), JSON.stringify(makeEntitlement(installationId)));
  fs.writeFileSync(path.join(dir, "installation-token.json"), JSON.stringify({
    token: "inst-tok",
    installation_id: installationId,
    saved_at: new Date().toISOString(),
  }));
  return installationId;
}

describe("offline grace (server unreachable)", () => {
  it("allows paid execution within the grace window after a recent validation", async () => {
    seedValidEntitlement();
    // Simulate a validation 1 day ago
    saveGateState({ latest_observed_at: Date.now() - 86400000, last_validated_at: new Date(Date.now() - 86400000).toISOString() }, dir);
    const neverResolve = () => new Promise((_, reject) => setTimeout(() => reject(new Error("unreachable")), 20));
    const r = await checkEntitlementOnline({ entitlementDir: dir, serverUrl: "http://127.0.0.1:1", _validate: neverResolve });
    assert.equal(r.allowed, true, JSON.stringify(r));
    assert.equal(r.state, GateState.OFFLINE_GRACE);
    assert.ok(r.graceDaysRemaining >= 1 && r.graceDaysRemaining <= OFFLINE_GRACE_DAYS);
  });

  it("fails closed when grace has elapsed", async () => {
    seedValidEntitlement();
    saveGateState({ latest_observed_at: Date.now() - 30 * 86400000, last_validated_at: new Date(Date.now() - 30 * 86400000).toISOString() }, dir);
    const neverResolve = () => new Promise((_, reject) => setTimeout(() => reject(new Error("unreachable")), 20));
    const r = await checkEntitlementOnline({ entitlementDir: dir, serverUrl: "http://127.0.0.1:1", _validate: neverResolve });
    assert.equal(r.allowed, false);
    assert.equal(r.state, GateState.SERVER_UNREACHABLE);
  });

  it("fails closed when there was never a successful validation", async () => {
    seedValidEntitlement();
    const neverResolve = () => new Promise((_, reject) => setTimeout(() => reject(new Error("unreachable")), 20));
    const r = await checkEntitlementOnline({ entitlementDir: dir, serverUrl: "http://127.0.0.1:1", _validate: neverResolve });
    assert.equal(r.allowed, false);
    assert.equal(r.state, GateState.SERVER_UNREACHABLE);
  });

  it("records last_validated_at on successful server validation", async () => {
    seedValidEntitlement();
    const r = await checkEntitlementOnline({
      entitlementDir: dir,
      serverUrl: "http://example.test",
      _validate: async () => ({ ok: true, status: 200, body: { valid: true, subscription: { status: "active" } } }),
    });
    assert.equal(r.allowed, true);
    assert.equal(r.serverValidated, true);
    const state = loadGateState(dir);
    assert.ok(state.last_validated_at, "last_validated_at must be persisted on success");
  });
});
