"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const os = require("os");
const path = require("path");
const http = require("http");
const { RuntimeStdio } = require("../src/runtime/test-seam");
const { RuntimeServer } = require("../src/runtime/test-seam");

function policy(plan, state = "ALLOWED") {
  return state === "ALLOWED" ? { allowed: true, state, entitlement: { plan_id: plan } } : { allowed: false, state, message: "Entitlement denied" };
}

async function stdioRequest(runtime, message) {
  const responses = [];
  runtime._respond = value => responses.push(value);
  await runtime._handleLine(JSON.stringify(message));
  return responses[0];
}

function files() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "minitok-mcp-paid-"));
  return { root, pidFile: path.join(root, "runtime.pid"), tokenFile: path.join(root, "runtime.token"), lockFile: path.join(root, "runtime.lock"), entitlementDir: path.join(root, "entitlement") };
}

function request(port, headers, body) {
  return new Promise((resolve, reject) => {
    const req = http.request({ host: "127.0.0.1", port, method: "POST", path: "/mcp", headers: { ...headers, "Content-Type": "application/json" } }, res => {
      let value = "";
      res.on("data", chunk => { value += chunk; });
      res.on("end", () => resolve({ status: res.statusCode, body: JSON.parse(value) }));
    });
    req.on("error", reject);
    req.setTimeout(3000, () => { req.destroy(new Error("request timeout")); });
    req.end(JSON.stringify(body));
  });
}

test("stdio accepts every supported plan and blocks invalid entitlement states", async () => {
  for (const plan of ["open", "select", "private"]) {
    const runtime = new RuntimeStdio({ authRequired: false, services: { entitlement: { status: async () => policy(plan) } } });
    const result = await stdioRequest(runtime, { jsonrpc: "2.0", id: 1, method: "tools/list", params: {} });
    assert.equal(result.result.tools.length, 14);
  }
  for (const state of ["MISSING", "SERVER_REJECTED", "EXPIRED", "MALFORMED"]) {
    const runtime = new RuntimeStdio({ authRequired: false, services: { entitlement: { status: async () => policy("open", state) } } });
    const result = await stdioRequest(runtime, { jsonrpc: "2.0", id: 1, method: "tools/list", params: {} });
    assert.equal(result.error.data.type, "ENTITLEMENT_REQUIRED");
    assert.equal(result.error.data.state, state);
  }
});

test("stdio initialize negotiates without exposing paid functionality", async () => {
  const runtime = new RuntimeStdio({ authToken: "secret", services: { entitlement: { status: async () => policy("open") } } });
  const init = await stdioRequest(runtime, { jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2024-11-05" } });
  assert.equal(init.result.protocolVersion, "2024-11-05");
  const list = await stdioRequest(runtime, { jsonrpc: "2.0", id: 2, method: "tools/list", params: {} });
  assert.equal(list.error.data.type, "AUTH_REQUIRED");
});

test("stdio permits explicitly disabled auth and entitlement", async () => {
  const runtime = new RuntimeStdio({ authRequired: false, entitlementRequired: false, services: { entitlement: { status: async () => policy("open", "MISSING") } } });
  const result = await stdioRequest(runtime, { jsonrpc: "2.0", id: 1, method: "tools/list", params: {} });
  assert.equal(result.result.tools.length, 14);
});

test("HTTP MCP honors explicit auth and entitlement disablement", async () => {
  const fixture = files();
  const server = new RuntimeServer({ ...fixture, port: 0, authRequired: false, entitlementRequired: false });
  server.services.entitlement.status = async () => policy("open", "MISSING");
  await server.start();
  try {
    const result = await request(server.port, {}, { jsonrpc: "2.0", id: 1, method: "tools/list", params: {} });
    assert.equal(result.status, 200);
    assert.equal(result.body.result.tools.length, 14);
  } finally {
    await server.stop();
    fs.rmSync(fixture.root, { recursive: true, force: true });
  }
});

test("HTTP MCP requires bearer auth and paid entitlement", async t => {
  for (const plan of ["open", "select", "private"]) {
    const fixture = files();
    const server = new RuntimeServer({ ...fixture, port: 0, runtimeToken: "http-secret" });
    server.services.entitlement.status = async () => policy(plan);
    await server.start();
    const headers = { Authorization: "Bearer http-secret" };
    const init = await request(server.port, headers, { jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2024-11-05" } });
    assert.equal(init.status, 200);
    const result = await request(server.port, headers, { jsonrpc: "2.0", id: 2, method: "tools/list", params: {} });
    assert.equal(result.status, 200);
    assert.equal(result.body.result.tools.length, 14);
    await server.stop();
  }
  for (const state of ["MISSING", "EXPIRED", "SERVER_REJECTED"]) {
    const fixture = files();
    const server = new RuntimeServer({ ...fixture, port: 0, runtimeToken: "http-secret" });
    server.services.entitlement.status = async () => policy("open", state);
    await server.start();
    const headers = { Authorization: "Bearer http-secret" };
    const init = await request(server.port, headers, { jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2024-11-05" } });
    assert.equal(init.status, 200);
    assert.equal(init.body.result.protocolVersion, "2024-11-05");
    const denied = await request(server.port, headers, { jsonrpc: "2.0", id: 2, method: "tools/list", params: {} });
    assert.equal(denied.status, 200);
    assert.equal(denied.body.error.data.type, "ENTITLEMENT_REQUIRED");
    assert.equal(denied.body.error.data.state, state);
    await server.stop();
    fs.rmSync(fixture.root, { recursive: true, force: true });
  }
  const fixture = files();
  const server = new RuntimeServer({ ...fixture, port: 0, runtimeToken: "http-secret" });
  server.services.entitlement.status = async () => policy("open");
  await server.start();
  const unauthorized = await request(server.port, {}, { jsonrpc: "2.0", id: 1, method: "tools/list", params: {} });
  assert.equal(unauthorized.status, 401);
  await server.stop();
  fs.rmSync(fixture.root, { recursive: true, force: true });
});
