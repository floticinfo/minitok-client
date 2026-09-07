"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");
const path = require("node:path");
const bin = path.resolve(__dirname, "../bin/minitok.js");
for (const [provider, key] of [["anthropic", "ANTHROPIC_API_KEY"], ["openai", "OPENAI_API_KEY"], ["google", "GOOGLE_API_KEY"]]) test(`live ${provider} discovery contract`, { skip: !process.env[key] }, () => { const result = spawnSync(process.execPath, [bin, "models", provider, "--discover", "--json"], { encoding: "utf8", timeout: 30000 }); assert.equal(result.status, 0); assert.doesNotMatch(`${result.stdout}${result.stderr}`, new RegExp(process.env[key], "i")); });
test("oauth live contract is opt-in", { skip: !process.env.MINITOK_LIVE_OAUTH }, () => { const result = spawnSync(process.execPath, [bin, "auth", "login"], { encoding: "utf8", timeout: 60000 }); assert.ok(result.status === 0 || result.status === 1); assert.doesNotMatch(`${result.stdout}${result.stderr}`, /client_secret|refresh_token/i); });
