"use strict";

const fs = require("fs");
const path = require("path");
const os = require("os");

const PID_FILE = path.join(os.homedir(), ".minitok", "runtime.pid");

function _isRunning() {
  try {
    const pid = parseInt(fs.readFileSync(PID_FILE, "utf-8").trim(), 10);
    if (isNaN(pid)) return false;
    process.kill(pid, 0);
    return true;
  } catch { return false; }
}

function _getPid() {
  try { return parseInt(fs.readFileSync(PID_FILE, "utf-8").trim(), 10); }
  catch { return null; }
}

async function cmdRuntimeStart(opts) {
  if (_isRunning()) {
    console.log(`minitok runtime already running (PID ${_getPid()})`);
    return 0;
  }

  const { RuntimeServer } = require("../../runtime/server");
  const server = new RuntimeServer({
    port: opts.port || 4578,
    knowledgePath: opts.knowledgePath,
    entitlementDir: opts.entitlementDir,
    auditPath: opts.auditPath,
  });

  await server.start();
  // Keep process alive
  return new Promise(() => {});
}

async function cmdRuntimeStop() {
  if (!_isRunning()) {
    console.log("minitok runtime is not running");
    return 0;
  }
  const pid = _getPid();
  try { process.kill(pid, "SIGTERM"); }
  catch {}
  console.log(`minitok runtime stopped (PID ${pid})`);
  return 0;
}

async function cmdRuntimeStatus() {
  if (_isRunning()) {
    console.log(`minitok runtime is running (PID ${_getPid()})`);
  } else {
    console.log("minitok runtime is not running");
  }
  return 0;
}

module.exports = { cmdRuntimeStart, cmdRuntimeStop, cmdRuntimeStatus };
