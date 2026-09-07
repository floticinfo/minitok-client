"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { writeConfig } = require("../src/cli/commands/mcp");

function fixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "minitok-mcp-rollback-"));
  return { root, file: path.join(root, "mcp.json") };
}

test("MCP fixture writes a new config atomically", () => {
  const { root, file } = fixture();
  try {
    writeConfig(file, { mcpServers: { minitok: { command: "minitok" } } });
    assert.deepEqual(JSON.parse(fs.readFileSync(file, "utf8")), { mcpServers: { minitok: { command: "minitok" } } });
    assert.equal(fs.existsSync(`${file}.bak`), false);
    assert.equal(fs.existsSync(`${file}.lock`), false);
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});

test("MCP fixture restores exact bytes after replacement failure", () => {
  const { root, file } = fixture();
  const original = Buffer.from('{"old":true}\r\n');
  const originalRename = fs.renameSync;
  let replacements = 0;
  fs.writeFileSync(file, original);
  try {
    fs.renameSync = (from, to) => {
      if (to === file && replacements++ === 0) throw Object.assign(new Error("simulated replacement failure"), { code: "EIO" });
      return originalRename(from, to);
    };
    assert.throws(() => writeConfig(file, { next: true }), /simulated replacement failure/);
    assert.deepEqual(fs.readFileSync(file), original);
    assert.equal(fs.existsSync(`${file}.bak`), false);
  } finally { fs.renameSync = originalRename; fs.rmSync(root, { recursive: true, force: true }); }
});

test("MCP fixture leaves no config or backup when prior config is missing", () => {
  const { root, file } = fixture();
  try {
    writeConfig(file, { next: true }, { rollback: true });
    assert.deepEqual(JSON.parse(fs.readFileSync(file, "utf8")), { next: true });
    assert.equal(fs.existsSync(`${file}.bak`), false);
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});

test("MCP fixture cleans backup after successful replacement", () => {
  const { root, file } = fixture();
  try {
    fs.writeFileSync(file, Buffer.from('{"old":true}\n'));
    writeConfig(file, { next: true });
    assert.deepEqual(JSON.parse(fs.readFileSync(file, "utf8")), { next: true });
    assert.equal(fs.existsSync(`${file}.bak`), false);
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});
