"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { RemoteMcpClient } = require("./remote");

test("remote MCP rejects untrusted OAuth authority", async () => {
  const originalFetch = global.fetch;
  global.fetch = async (url) => {
    if (String(url) === "https://service.example/mcp") return new Response("{}", { status: 401, headers: { "www-authenticate": 'Bearer resource_metadata="https://service.example/.well-known/oauth-protected-resource/mcp"' } });
    return new Response(JSON.stringify({ authorization_servers: ["https://evil.example"], scopes_supported: ["read"] }), { status: 200 });
  };
  try { await assert.rejects(() => new RemoteMcpClient({ url: "https://service.example/mcp" }).request("initialize"), error => error.code === "REMOTE_OAUTH_UNTRUSTED_AUTHORITY"); }
  finally { global.fetch = originalFetch; }
});
