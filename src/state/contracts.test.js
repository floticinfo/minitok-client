"use strict";

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { writeContract, writeContextManifest, readContract, readContextManifest } = require("./contracts");

describe("minitok contract state", () => {
  it("writes and reads task contracts under .minitok/contracts", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "minitok-state-"));
    writeContract(root, { status: "running", goal: "test", verify_command: "VERIFY_CMD.sh" });
    const contract = readContract(root);
    assert.equal(contract.status, "running");
    assert.equal(contract.goal, undefined);
    assert.match(contract.goal_id, /^[a-f0-9]{16}$/);
    assert.equal(path.dirname(path.join(root, ".minitok", "contracts", "task-contract.json")), path.join(root, ".minitok", "contracts"));
    fs.rmSync(root, { recursive: true, force: true });
  });

  it("writes and reads a context manifest beside the task contract", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "minitok-state-"));
    writeContextManifest(root, { goal: "test", budget_chars: 1000, original_chars: 2000, final_chars: 1000 });
    const manifest = readContextManifest(root);
    assert.equal(manifest.budget_chars, 1000);
    assert.equal(manifest.final_chars, 1000);
    fs.rmSync(root, { recursive: true, force: true });
  });
});
