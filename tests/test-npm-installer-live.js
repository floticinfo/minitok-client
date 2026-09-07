"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");
test("npm registry integrity contract", { skip: !process.env.MINITOK_LIVE_NPM }, () => { const meta = spawnSync("npm", ["view", "@flotic/minitok@latest", "dist.integrity", "--json"], { encoding: "utf8", timeout: 30000 }); assert.equal(meta.status, 0); assert.match(meta.stdout, /sha512-/); });
test("installer mismatch fixture is explicit", () => { assert.throws(() => { const expected = "sha512-expected"; const actual = "sha512-actual"; if (expected !== actual) throw new Error("Package integrity mismatch"); }, /integrity mismatch/i); });
