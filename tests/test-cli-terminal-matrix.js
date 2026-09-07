"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");
const path = require("node:path");
const bin = path.resolve(__dirname, "../bin/minitok.js");
test("gui help is stable in plain terminal mode", () => { const result = spawnSync(process.execPath, [bin, "gui", "--help"], { env: { ...process.env, MINITOK_NO_COLOR: "1", MINITOK_ASCII: "1" }, encoding: "utf8" }); assert.equal(result.status, 0); assert.match(result.stdout, /--repo/); });
test("non-tty task path fails with actionable missing task", () => { const result = spawnSync(process.execPath, [bin, "gui"], { env: { ...process.env, MINITOK_NO_COLOR: "1" }, encoding: "utf8" }); assert.notEqual(result.status, 0); assert.match(`${result.stdout}${result.stderr}`, /task|MINITOK_TASK/i); });
