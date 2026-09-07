"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { runTerminalProbe } = require("../src/cli/terminal-probe");
test("long-running terminal probe is bounded", { timeout: 15000 }, () => { const result = runTerminalProbe(5000); assert.equal(result.output.trim(), "minitok-pty"); });
test("optional node-pty scenario contract", () => { let pty; try { pty = require("node-pty"); } catch { return; } const shell = process.platform === "win32" ? "cmd.exe" : process.env.SHELL || "/bin/sh"; const child = pty.spawn(shell, [], { cols: 80, rows: 24 }); child.kill(); assert.ok(child); });
