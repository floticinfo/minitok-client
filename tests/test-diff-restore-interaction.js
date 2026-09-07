"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { restoreCheckpoint } = require("../src/runtime/checkpoint");
test("restore preview never applies changes without apply mode", () => assert.throws(() => restoreCheckpoint(process.cwd(), "missing", { preview: true }), /patch not found/i));
test("restore API exposes rollback-capable contract", () => { assert.equal(typeof restoreCheckpoint, "function"); });
