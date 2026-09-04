"use strict";

const { describe, it, afterEach } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const os = require("os");
const path = require("path");
const http = require("http");
const { RuntimeServer } = require("./server");

function request(port, options = {}, body) {
  return new Promise((resolve, reject) => {
    const req = http.request({ host: "127.0.0.1", port, ...options }, res => {
      const chunks = [];
      res.on("data", chunk => chunks.push(chunk));
      res.on("end", () => resolve({ status: res.statusCode, body: Buffer.concat(chunks).toString("utf8") }));
    });
    req.on("error", reject);
    if (body !== undefined) req.write(body);
    req.end();
  });
}

function runtimeFiles() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "mt-runtime-"));
  return { root, pidFile: path.join(root, "runtime.pid"), tokenFile: path.join(root, "runtime.token"), lockFile: path.join(root, "runtime.lock") };
}

describe("runtime PID cleanup", () => {
  let files;
  afterEach(() => { if (files) fs.rmSync(files.root, { recursive: true, force: true }); });

  it("removes only PID and token files owned by its nonce and token path", () => {
    files = runtimeFiles();
    const server = new RuntimeServer({ ...files, authRequired: false, entitlementRequired: false });
    server._writePid();
    server._removePid();
    assert.equal(fs.existsSync(files.pidFile), false);
    assert.equal(fs.existsSync(files.tokenFile), false);
  });

  it("does not remove replacement PID or token metadata", () => {
    files = runtimeFiles();
    const server = new RuntimeServer({ ...files, authRequired: false, entitlementRequired: false });
    server._writePid();
    fs.writeFileSync(files.pidFile, JSON.stringify({ pid: process.pid, nonce: "replacement", tokenFile: files.tokenFile }));
    server._removePid();
    assert.equal(fs.existsSync(files.pidFile), true);
    assert.equal(fs.existsSync(files.tokenFile), true);
  });

  it("handles localhost HTTP auth, chunked bodies, malformed JSON, and oversized bodies", async () => {
    files = runtimeFiles();
    const server = new RuntimeServer({ ...files, port: 0, entitlementRequired: false });
    await server.start();
    const port = server._port;
    try {
      assert.equal((await request(port, { path: "/health" })).status, 200);
      assert.equal((await request(port, { path: "/api/v1/status" })).status, 401);
      const token = fs.readFileSync(files.tokenFile, "utf8").trim();
      assert.equal((await request(port, { path: "/api/v1/status", headers: { Authorization: `Bearer ${token}` } })).status, 200);
      assert.equal((await request(port, { method: "POST", path: "/api/v1/knowledge/query", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } }, "{bad")).status, 400);
      const oversized = "{" + "x".repeat(1024 * 1024 + 1) + "}";
      assert.equal((await request(port, { method: "POST", path: "/api/v1/knowledge/query", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", "Transfer-Encoding": "chunked" } }, oversized)).status, 413);
    } finally {
      await server.stop();
    }
  });
});
