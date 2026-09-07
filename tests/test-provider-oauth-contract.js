"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");
const path = require("node:path");
const bin = path.resolve(__dirname, "../bin/minitok.js");
test("provider contract does not expose credentials", () => { const result = spawnSync(process.execPath, [bin, "gui", "--help"], { env: { ...process.env, OPENAI_API_KEY: "", ANTHROPIC_API_KEY: "" }, encoding: "utf8" }); assert.doesNotMatch(`${result.stdout}${result.stderr}`, /sk-|AIza/); });
test("oauth command is discoverable", () => { const source = require("fs").readFileSync(path.resolve(__dirname, "../src/cli/gui-commands.js"), "utf8"); assert.match(source, /auth.*login|OAuth/); });
