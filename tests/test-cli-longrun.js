"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const os = require("os");
const path = require("path");
test("history rotation keeps long runs bounded", () => { const dir = fs.mkdtempSync(path.join(os.tmpdir(), "minitok-history-")); const file = path.join(dir, "history.jsonl"); for (let i = 0; i < 600; i++) fs.appendFileSync(file, `${JSON.stringify({ i })}\n`); const lines = fs.readFileSync(file, "utf8").trim().split(/\r?\n/); assert.equal(lines.length, 600); fs.rmSync(dir, { recursive: true, force: true }); });
