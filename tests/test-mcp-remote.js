"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const { RemoteMcpClient, validateRemoteUrl, classifyRemoteError, canFallbackToLocal, executeRemoteWithLocalFallback, REMOTE_READ_ONLY_TOOLS } = require("../src/mcp/remote");

function response(status, body, headers = {}) { return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", ...headers } }); }

test("remote MCP requires HTTPS /mcp URLs", () => {
  assert.equal(validateRemoteUrl("https://service.example/mcp"), "https://service.example/mcp");
  assert.throws(() => validateRemoteUrl("http://service.example/mcp"), /HTTPS/);
  assert.throws(() => validateRemoteUrl("https://service.example/other"), /\/mcp/);
  assert.throws(() => validateRemoteUrl("https://user:pass@service.example/mcp"), /credentials/);
});

test("remote MCP allowlist matches the server read-only contract", () => {
  assert.deepEqual([...REMOTE_READ_ONLY_TOOLS], ["minitok_status", "minitok_compact"]);
});

test("remote MCP sends customer bearer and carries session headers", async () => {
  const originalFetch = global.fetch;
  const requests = [];
  global.fetch = async (url, options) => {
    requests.push({ url, options, body: JSON.parse(options.body) });
    const body = JSON.parse(options.body);
    if (body.method === "initialize") return response(200, { jsonrpc: "2.0", id: body.id, result: { protocolVersion: "2024-11-05" } }, { "Mcp-Session-Id": "a".repeat(32) });
    return response(200, { jsonrpc: "2.0", id: body.id, result: { tools: [{ name: "minitok_status" }] } });
  };
  try {
    const client = new RemoteMcpClient({ url: "https://service.example/mcp", token: "jwt" });
    await client.handshake();
    assert.equal(requests[0].options.headers.Authorization, "Bearer jwt");
    assert.equal(requests[1].options.headers.Authorization, "Bearer jwt");
    assert.equal(requests[1].options.headers["Mcp-Session-Id"], "a".repeat(32));
  } finally { global.fetch = originalFetch; }
});

test("remote MCP rejects local-only and unknown tools without sending them", async () => {
  const client = new RemoteMcpClient({ url: "https://service.example/mcp", token: "jwt" });
  await assert.rejects(() => client.callTool("minitok_run", { repo: "C:\\private" }), error => error.code === "REMOTE_TOOL_UNSUPPORTED");
  await assert.rejects(() => client.callTool("unknown", {}), error => error.code === "REMOTE_TOOL_UNSUPPORTED");
});

test("remote MCP does not serialize local paths or installation token files", async () => {
  const originalFetch = global.fetch;
  let payload = "";
  global.fetch = async (_url, options) => { payload += options.body; return response(200, { jsonrpc: "2.0", id: 1, result: { tools: [] } }); };
  try { await new RemoteMcpClient({ url: "https://service.example/mcp", token: "jwt" }).request("tools/list", { safe: true }); } finally { global.fetch = originalFetch; }
  assert.equal(payload.includes("installation-token.json"), false);
  assert.equal(payload.includes(process.cwd()), false);
  assert.equal(payload.includes("jwt"), false);
});

test("remote MCP classifies fallback and terminal errors", () => {
  assert.equal(classifyRemoteError({ code: "ECONNRESET" }), "network");
  assert.equal(classifyRemoteError({ status: 503 }), "server");
  assert.equal(classifyRemoteError({ status: 401 }), "auth");
  assert.equal(classifyRemoteError({ status: 422 }), "protocol");
  assert.equal(classifyRemoteError({ status: 429 }), "rate_limit");
  assert.equal(classifyRemoteError({ classification: "SESSION_REQUIRED" }), "SESSION_REQUIRED");
  assert.equal(classifyRemoteError({ classification: "SESSION_BINDING_MISMATCH" }), "SESSION_BINDING_MISMATCH");
  assert.equal(canFallbackToLocal({ status: 503 }), true);
  assert.equal(canFallbackToLocal({ status: 401 }), false);
  assert.equal(canFallbackToLocal({ status: 422 }), false);
});

test("local MCP defaults to read permission and rejects unknown scopes", () => {
  const { RuntimeStdio } = require("../src/runtime/stdio");
  const runtime = new RuntimeStdio({ authToken: "token", workspaceRoot: process.cwd() });
  assert.deepEqual([...runtime._permissions], ["read"]);
  assert.throws(() => new RuntimeStdio({ authToken: "token", permissions: "read,admin", workspaceRoot: process.cwd() }), /Unknown local MCP scope/);
});

test("MCP fallback is explicit and transport-only", async () => {
  assert.deepEqual(await executeRemoteWithLocalFallback({ remote: async () => "remote", local: async () => "local" }), { source: "remote", result: "remote" });
  assert.deepEqual(await executeRemoteWithLocalFallback({ allowFallback: true, remote: async () => { throw { status: 503 }; }, local: async () => "local" }), { source: "local", result: "local" });
  await assert.rejects(() => executeRemoteWithLocalFallback({ allowFallback: true, remote: async () => { throw { status: 403 }; }, local: async () => "local" }), error => error.status === 403);
});

test("local MCP default remains the existing stdio configuration", () => {
  const { planChange } = require("../src/cli/commands/mcp");
  const plan = planChange("C:\\nonexistent\\mcp.json", "connect");
  assert.equal(plan.data.mcpServers.minitok.command, process.execPath);
  assert.match(plan.data.mcpServers.minitok.args[0], /stdio-entry\.js$/);
  assert.match(plan.data.mcpServers.minitok.env.MINITOK_MCP_AUTH_TOKEN_FILE, /runtime-token\.json$/);
});
