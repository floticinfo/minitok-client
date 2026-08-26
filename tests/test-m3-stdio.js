
const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { spawn } = require("child_process");
const path = require("path");
const fs2 = require("fs");

const SCRIPT = path.join(__dirname, "..", "src", "runtime", "stdio-entry.js");
const TO = 8000;

function send(p, msg, t) {
  t = t || TO;
  return new Promise((ok, no) => {
    const tm = setTimeout(() => no(new Error("timeout")), t);
    let buf = "";
    function on(d) {
      buf += d.toString();
      const ls = buf.split("\n");
      for (let i = 0; i < ls.length-1; i++) {
        const l = ls[i].trim(); if (!l) continue;
        try { clearTimeout(tm); p.stdout.removeListener("data", on); ok(JSON.parse(l)); return; } catch {} }
      buf = ls[ls.length-1] || "";
    }
    p.stdout.on("data", on);
    p.stdin.write(JSON.stringify(msg) + "\n");
  });
}

function wait(p) { return new Promise(r => { setTimeout(() => { p.kill(); r(); }, 2000); p.on("exit", () => r()); }); }

if (!fs2.existsSync(SCRIPT)) fs2.writeFileSync(SCRIPT, "require(\"./stdio.js\").start();", "utf-8");

describe("M3 stdio MCP integration", () => {
  it("starts without MODULE_NOT_FOUND", async () => {
    const p = spawn(process.execPath, [SCRIPT], { cwd: path.dirname(SCRIPT), stdio: ["pipe","pipe","pipe"] });
    let stderr = ""; p.stderr.on("data", d => { stderr += d.toString(); });
    await new Promise(r => setTimeout(r, 500));
    assert.ok(p.exitCode === null, "Process alive. stderr: " + stderr);
    assert.ok(!stderr.includes("MODULE_NOT_FOUND"), "No MODULE_NOT_FOUND: " + stderr);
    p.kill(); await wait(p);
  });

  it("initialize returns valid response", async () => {
    const p = spawn(process.execPath, [SCRIPT], { cwd: path.dirname(SCRIPT), stdio: ["pipe","pipe","pipe"] });
    try {
      const r = await send(p, { jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2024-11-05", capabilities: {}, clientInfo: { name: "test" } } });
      assert.equal(r.result.protocolVersion, "2024-11-05");
      assert.equal(r.result.serverInfo.name, "minitok-runtime");
    } finally { p.kill(); await wait(p); }
  });

  it("tools/list returns 8 tools", async () => {
    const p = spawn(process.execPath, [SCRIPT], { cwd: path.dirname(SCRIPT), stdio: ["pipe","pipe","pipe"] });
    try {
      await send(p, { jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2024-11-05", capabilities: {}, clientInfo: { name: "test" } } });
      p.stdin.write(JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized" }) + "\n");
      const r = await send(p, { jsonrpc: "2.0", id: 2, method: "tools/list", params: {} });
      assert.equal(r.result.tools.length, 8, "Expected 8 tools, got " + r.result.tools.length);
      const names = r.result.tools.map(t => t.name);
      assert.ok(names.includes("minitok_knowledge_query"));
      assert.ok(names.includes("minitok_status"));
      assert.ok(names.includes("minitok_observe"));
      for (const t of r.result.tools) assert.ok(t.inputSchema && t.inputSchema.type === "object");
    } finally { p.kill(); await wait(p); }
  });

  it("tools/call minitok_status works", async () => {
    const p = spawn(process.execPath, [SCRIPT], { cwd: path.dirname(SCRIPT), stdio: ["pipe","pipe","pipe"] });
    try {
      await send(p, { jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2024-11-05", capabilities: {}, clientInfo: { name: "test" } } });
      p.stdin.write(JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized" }) + "\n");
      const r = await send(p, { jsonrpc: "2.0", id: 3, method: "tools/call", params: { name: "minitok_status", arguments: {} } });
      assert.equal(r.id, 3);
      assert.ok(r.result && r.result.content);
      const data = JSON.parse(r.result.content[0].text);
      assert.ok(data.entitlement, "Should have entitlement");
    } finally { p.kill(); await wait(p); }
  });

  it("tools/call minitok_knowledge_query works", async () => {
    const p = spawn(process.execPath, [SCRIPT], { cwd: path.dirname(SCRIPT), stdio: ["pipe","pipe","pipe"] });
    try {
      await send(p, { jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2024-11-05", capabilities: {}, clientInfo: { name: "test" } } });
      p.stdin.write(JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized" }) + "\n");
      const r = await send(p, { jsonrpc: "2.0", id: 4, method: "tools/call", params: { name: "minitok_knowledge_query", arguments: { limit: 5 } } });
      assert.equal(r.id, 4);
      assert.ok(r.result && r.result.content);
    } finally { p.kill(); await wait(p); }
  });

  it("unknown method returns error", async () => {
    const p = spawn(process.execPath, [SCRIPT], { cwd: path.dirname(SCRIPT), stdio: ["pipe","pipe","pipe"] });
    try {
      const r = await send(p, { jsonrpc: "2.0", id: 99, method: "nonexistent", params: {} });
      assert.equal(r.error.code, -32601);
    } finally { p.kill(); await wait(p); }
  });

  it("malformed JSON does not crash", async () => {
    const p = spawn(process.execPath, [SCRIPT], { cwd: path.dirname(SCRIPT), stdio: ["pipe","pipe","pipe"] });
    try {
      await send(p, { jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2024-11-05", capabilities: {}, clientInfo: { name: "test" } } });
      p.stdin.write("not valid json {{{\n");
      await new Promise(r => setTimeout(r, 500));
      assert.equal(p.exitCode, null, "Process alive after malformed input");
    } finally { p.kill(); await wait(p); }
  });
});
