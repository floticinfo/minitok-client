"use strict";

/**
 * Run lock — prevents concurrent `minitok run` invocations from racing on
 * the same workspace (.minitok state, knowledge store, applied diffs).
 *
 * Cross-platform, dependency-free: an exclusive file creation (O_EXCL via
 * 'wx') plus PID/age-based stale detection. A lock left behind by a crashed
 * process is reported as stale when its PID is no longer alive on the same
 * host, or when it exceeds the maximum expected run duration.
 */

const fs = require("fs");
const os = require("os");
const path = require("path");
const crypto = require("crypto");

const LOCK_FILE = path.join(".minitok", "run.lock");
const STALE_MS = 24 * 60 * 60 * 1000;

function isPidAlive(pid) {
  if (!Number.isInteger(pid) || pid <= 0) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return error.code === "EPERM";
  }
}

function readLockInfo(lockPath) {
  try {
    return JSON.parse(fs.readFileSync(lockPath, "utf-8"));
  } catch {
    return null;
  }
}

function lockIsStale(lockPath) {
  const info = readLockInfo(lockPath);
  if (!info) return true;
  const sameHost = !info.host || info.host === os.hostname();
  if (sameHost && !isPidAlive(info.pid)) return true;
  const startedAt = info.started_at ? new Date(info.started_at).getTime() : NaN;
  if (!Number.isNaN(startedAt) && Date.now() - startedAt > STALE_MS) return true;
  return false;
}

function acquireRunLock(workspaceRoot, _attempts = 0) {
  const directory = path.join(workspaceRoot, ".minitok");
  fs.mkdirSync(directory, { recursive: true });
  const lockPath = path.join(directory, "run.lock");
  let fd;
  try {
    fd = fs.openSync(lockPath, "wx");
  } catch (error) {
    const code = /** @type {NodeJS.ErrnoException} */ (error).code;
    if (code !== "EEXIST") throw error;
    if (!lockIsStale(lockPath)) {
      const info = readLockInfo(lockPath);
      const busy = new Error(
        `Another minitok run is already in progress for this workspace (PID ${info?.pid ?? "?"}). ` +
        `If no run is active, delete ${lockPath} and retry.`
      );
      /** @type {NodeJS.ErrnoException} */ (busy).code = "minitok_run_locked";
      throw busy;
    }
    try {
      fs.unlinkSync(lockPath);
    } catch (unlinkError) {
      // A stuck undeletable lock (AV scan, open handle) must not recurse
      // forever — fail with actionable guidance after a few bounded tries.
      if (_attempts >= 3) {
        const err = new Error(`Stale run lock at ${lockPath} could not be removed (${unlinkError.code || unlinkError.message}). Delete it manually and retry.`);
        /** @type {NodeJS.ErrnoException} */ (err).code = "minitok_run_lock_stuck";
        throw err;
      }
    }
    return acquireRunLock(workspaceRoot, _attempts + 1);
  }
  const token = crypto.randomBytes(16).toString("hex");
  const ownership = JSON.stringify({ pid: process.pid, host: os.hostname(), started_at: new Date().toISOString(), token });
  try {
    fs.writeFileSync(fd, ownership, "utf-8");
  } catch {}
  let released = false;
  return {
    path: lockPath,
    release() {
      if (released) return;
      released = true;
      try {
        fs.closeSync(fd);
      } catch {}
      const info = readLockInfo(lockPath);
      if (info?.pid !== process.pid || (info.host && info.host !== os.hostname()) || info.token !== token) return;
      try {
        fs.unlinkSync(lockPath);
      } catch {}
    },
  };
}

module.exports = { acquireRunLock, LOCK_FILE, STALE_MS };
