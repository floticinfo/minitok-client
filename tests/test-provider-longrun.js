"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { spawn } = require("node:child_process");
const path = require("node:path");
const bin = path.resolve(__dirname, "../bin/minitok.js");
test("provider long-run harness is opt-in", { skip: !process.env.MINITOK_LIVE_PROVIDER }, async () => { const child = spawn(process.execPath, [bin, "gui", "--task", "provider live smoke"], { env: process.env, stdio: ["ignore", "pipe", "pipe"] }); let output = ""; child.stdout.on("data", data => { output += data.toString(); }); child.stderr.on("data", data => { output += data.toString(); }); const status = await new Promise(resolve => { const timer = setTimeout(() => { child.kill(); resolve(null); }, 120000); child.on("close", code => { clearTimeout(timer); resolve(code); }); }); assert.equal(status, 0); assert.doesNotMatch(output, /sk-|AIza|refresh_token|client_secret/i); });
