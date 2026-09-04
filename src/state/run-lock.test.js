"use strict";

const { describe, it, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { acquireRunLock, LOCK_FILE } = require("../state/run-lock");

function tmpDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "mt-lock-"));
}

describe("run lock", () => {
  let root;
  beforeEach(() => { root = tmpDir(); });

  it("acquires and releases exclusively", () => {
    const lock = acquireRunLock(root);
    assert.ok(fs.existsSync(path.join(root, LOCK_FILE)));
    assert.throws(() => acquireRunLock(root), /already in progress/);
    lock.release();
    assert.ok(!fs.existsSync(path.join(root, LOCK_FILE)));
    const again = acquireRunLock(root);
    again.release();
  });

  it("treats a dead-PID lock as stale and reclaims it", () => {
    const lockPath = path.join(root, LOCK_FILE);
    fs.mkdirSync(path.dirname(lockPath), { recursive: true });
    fs.writeFileSync(lockPath, JSON.stringify({ pid: 999999999, host: os.hostname(), started_at: new Date().toISOString() }), "utf-8");
    const lock = acquireRunLock(root);
    assert.ok(lock);
    lock.release();
  });

  it("reports a live foreign lock as busy with the holder PID", () => {
    const lockPath = path.join(root, LOCK_FILE);
    fs.mkdirSync(path.dirname(lockPath), { recursive: true });
    const child = require("child_process").spawn("node", ["-e", "setInterval(()=>{},1000)"], { stdio: "ignore", detached: true });
    try {
      fs.writeFileSync(lockPath, JSON.stringify({ pid: child.pid, host: os.hostname(), started_at: new Date().toISOString() }), "utf-8");
      assert.throws(() => acquireRunLock(root), (e) => e.code === "minitok_run_locked" && String(e.message).includes(String(child.pid)));
    } finally {
      try { process.kill(child.pid); } catch {}
    }
  });

  it("does not leave a lock file behind after release", () => {
    const lock = acquireRunLock(root);
    lock.release();
    assert.throws(() => fs.statSync(path.join(root, LOCK_FILE)), /ENOENT/);
  });

  it("does not release a replacement lock", () => {
    const lock = acquireRunLock(root);
    const lockPath = path.join(root, LOCK_FILE);
    const replacement = JSON.stringify({ pid: process.pid, host: os.hostname(), started_at: new Date().toISOString(), token: "replacement" });
    fs.writeFileSync(lockPath, replacement, "utf8");
    lock.release();
    assert.equal(fs.existsSync(lockPath), true);
  });
});
