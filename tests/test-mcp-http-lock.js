"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawn } = require("child_process");
const { writeConfig, readLock } = require("../src/cli/commands/mcp");

function waitForMessage(child, message) {
  return new Promise((resolve, reject) => {
    child._testOutput = child._testOutput || "";
    if (!child._testMessageListener) {
      child._testMessageListener = chunk => {
        child._testOutput += chunk;
        for (const waiter of child._testWaiters || []) {
          if (child._testOutput.includes(waiter.message)) waiter.resolve();
        }
        child._testWaiters = (child._testWaiters || []).filter(waiter => !child._testOutput.includes(waiter.message));
      };
      child._testWaiters = [];
      child.stdout.on("data", child._testMessageListener);
    }
    if (child._testOutput.includes(message)) return resolve();
    child._testWaiters.push({ message, resolve });
    child.once("error", reject);
    child.once("exit", code => reject(new Error(`child exited before ${message}: ${code}`)));
  });
}

test("MCP config lock rejects an aged lock when its owner process is still live", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "minitok-mcp-lock-"));
  const child = spawn(process.execPath, ["-e", "setInterval(() => {}, 1000)"], { stdio: "ignore" });
  try {
    const file = path.join(root, "mcp.json");
    const lock = `${file}.lock`;
    fs.writeFileSync(lock, JSON.stringify({ pid: child.pid, nonce: "c".repeat(32) }));
    fs.utimesSync(lock, new Date(Date.now() - 60000), new Date(Date.now() - 60000));
    assert.throws(() => writeConfig(file, { mcpServers: {} }), /MCP config is busy/);
    assert.equal(JSON.parse(fs.readFileSync(lock, "utf8")).pid, child.pid);
  } finally {
    try { process.kill(child.pid); } catch {}
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("MCP config lock removes an aged lock whose owner process is not live", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "minitok-mcp-lock-"));
  try {
    const file = path.join(root, "mcp.json");
    const lock = `${file}.lock`;
    fs.writeFileSync(lock, JSON.stringify({ pid: 999999, nonce: "a".repeat(32) }));
    fs.utimesSync(lock, new Date(Date.now() - 60000), new Date(Date.now() - 60000));
    writeConfig(file, { mcpServers: {} });
    assert.equal(fs.existsSync(lock), false);
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});

test("MCP config lock allows exactly one concurrent writer", async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "minitok-mcp-lock-"));
  try {
    const file = path.join(root, "mcp.json");
    const script = "const fs = require('fs'); const { writeConfig } = require(process.argv[1]); const file = process.argv[2]; const value = process.argv[3]; const lock = file + '.lock'; process.stdout.write('ready'); process.stdin.once('data', () => { try { if (value === 'one') { const fd = fs.openSync(lock, 'wx', 0o600); fs.writeFileSync(fd, JSON.stringify({ pid: process.pid, nonce: 'd'.repeat(32) })); fs.closeSync(fd); process.stdout.write('held'); process.stdin.once('data', () => { fs.unlinkSync(lock); writeConfig(file, { value }); process.exit(0); }); } else { try { writeConfig(file, { value }); process.stdout.write('won'); process.exit(0); } catch { process.stdout.write('lost'); process.exit(1); } } } catch { process.exit(1); } });";
    const modulePath = path.resolve(__dirname, "../src/cli/commands/mcp.js");
    const children = ["one", "two"].map(value => spawn(process.execPath, ["-e", script, modulePath, file, value], { stdio: ["pipe", "pipe", "ignore"] }));
    await Promise.all(children.map(child => waitForMessage(child, "ready")));
    const statusPromises = children.map(child => new Promise(resolve => child.once("exit", code => resolve(code))));
    children[0].stdin.write("go");
    await waitForMessage(children[0], "held");
    children[1].stdin.write("go");
    await new Promise(resolve => setTimeout(resolve, 25));
    children[0].stdin.write("release");
    const statuses = await Promise.all(statusPromises);
    assert.equal(statuses.filter(code => code === 0).length, 1);
    assert.equal(statuses.filter(code => code === 1).length, 1);
    assert.deepEqual(Object.keys(JSON.parse(fs.readFileSync(file, "utf8"))), ["value"]);
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});

test("MCP config lock replaces stale ownership before writing", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "minitok-mcp-lock-"));
  try {
    const file = path.join(root, "mcp.json");
    fs.writeFileSync(file, '{"old":true}\n');
    fs.writeFileSync(`${file}.lock`, JSON.stringify({ pid: 999999, nonce: "b".repeat(32) }));
    const result = writeConfig(file, { next: true });
    assert.deepEqual(JSON.parse(fs.readFileSync(file, "utf8")), { next: true });
    assert.equal(result, undefined);
    assert.deepEqual(JSON.parse(fs.readFileSync(file, "utf8")), { next: true });
    assert.equal(fs.existsSync(`${file}.lock`), false);
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});
