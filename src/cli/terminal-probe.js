"use strict";
const os = require("os");
const { spawnSync } = require("child_process");
function terminalCommand() { if (process.platform === "win32") return { command: process.env.ComSpec || "cmd.exe", args: ["/d", "/s", "/c", "echo minitok-pty"] }; return { command: process.env.SHELL || "/bin/sh", args: ["-lc", "printf minitok-pty"] }; }
function runTerminalProbe(timeoutMs = 10000) { const command = terminalCommand(); const result = spawnSync(command.command, command.args, { encoding: "utf8", timeout: timeoutMs, windowsHide: true }); return { platform: process.platform, arch: os.arch(), command: command.command, status: result.status, output: result.stdout, error: result.error?.message || result.stderr || null }; }
module.exports = { terminalCommand, runTerminalProbe };
