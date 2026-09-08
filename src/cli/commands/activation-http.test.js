"use strict";
const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { ReadableStream } = require("node:stream/web");
const { resolveServerUrl } = require("./server-config");
const { shouldBypassProxy } = require("../../core/http");
const activate = require("./activate");
const activationKey = require("./activation-key");

function response(body = {}) {
  const bytes = new TextEncoder().encode(JSON.stringify(body));
  return {
    status: 200,
    headers: { get: name => name === "content-length" ? String(bytes.byteLength) : null },
    body: new ReadableStream({ start(controller) { controller.enqueue(bytes); controller.close(); } }),
  };
}

describe("activation HTTP consistency", () => {
  it("gives --server precedence over the environment server", () => {
    const old = process.env.minitok_server_url;
    process.env.minitok_server_url = "https://env.example";
    try { assert.equal(resolveServerUrl({ cliServer: "https://cli.example/" }), "https://cli.example"); }
    finally {
      if (old === undefined) delete process.env.minitok_server_url;
      else process.env.minitok_server_url = old;
    }
  });

  it("bypasses proxies for loopback hosts listed in NO_PROXY", () => {
    const old = process.env.NO_PROXY;
    process.env.NO_PROXY = "localhost,127.0.0.1,.internal.example";
    try {
      assert.equal(shouldBypassProxy("http://localhost:4580/v1/activate"), true);
      assert.equal(shouldBypassProxy("http://127.0.0.1:4580/v1/activate"), true);
      assert.equal(shouldBypassProxy("https://api.example/v1/activate"), false);
    } finally {
      if (old === undefined) delete process.env.NO_PROXY;
      else process.env.NO_PROXY = old;
    }
  });

  it("uses the same request implementation for activate and activation-key", async () => {
    const oldFetch = global.fetch;
    const calls = [];
    global.fetch = async (url, options) => { calls.push({ url, options }); return response({ ok: true }); };
    try {
      const first = await activate._httpPost("https://api.example/v1/activate", { key: "k", installation_id: "i" });
      const second = await activationKey._httpPost("https://api.example/v1/activation-key", {}, { Authorization: "Bearer token" });
      assert.deepEqual(Object.keys(first), Object.keys(second));
      assert.equal(calls.length, 2);
      assert.equal(calls[0].options.method, calls[1].options.method);
      assert.deepEqual(calls[0].options.headers["Content-Type"], calls[1].options.headers["Content-Type"]);
      assert.equal(typeof calls[0].options.body, "string");
      assert.equal(typeof calls[1].options.body, "string");
    } finally { global.fetch = oldFetch; }
  });
});
