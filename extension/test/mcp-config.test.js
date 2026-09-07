"use strict";
const path = require("node:path");
const fs = require("node:fs");
const test = require("node:test");
const assert = require("node:assert/strict");
const source = fs.readFileSync(path.join(__dirname, "..", "src", "workspace.ts"), "utf8");
const mcp = fs.readFileSync(path.join(__dirname, "..", "src", "mcp.ts"), "utf8");

test("packaged MCP runtime is resolved below the extension directory", () => {
  assert.match(source, /packagedMcpCommand/);
  assert.match(mcp, /runtime", "src", "runtime", "stdio-entry\.js/);
  assert.doesNotMatch(source, /\.\.\/\.\.\/src\/runtime\/stdio-entry/);
});

test("MCP command configuration supports quoted Windows paths and arrays", () => {
  assert.match(source, /parseMcpCommand/);
  assert.match(source, /string\[\]/);
  assert.match(mcp, /Unclosed quote/);
});
