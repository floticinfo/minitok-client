"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { restoreCheckpoint } = require("../src/runtime/checkpoint");
test("Problems fixtures cover IDE/compiler formats", () => { const fs = require("fs"); const path = require("path"); for (const file of ["problems.sarif.json", "problems-eslint.json", "problems-tsc.txt"]) assert.ok(fs.existsSync(path.join(__dirname, "fixtures", file))); });
test("restore preview is non-mutating", () => { assert.throws(() => restoreCheckpoint(process.cwd(), "missing-checkpoint", { preview: true }), /Checkpoint patch not found/); });
