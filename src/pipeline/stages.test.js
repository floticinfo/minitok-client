"use strict";

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { intel } = require("./intel");
const { verifyCommand } = require("./check");
const { buildRepairTask } = require("./repair");

describe("Pipeline stages", () => {
  it("parses repository intelligence from provider output", async () => {
    const provider = { complete: async () => ({ text: JSON.stringify({ summary: "found", relevant_files: ["src/index.js"] }), tokens: { input: 2, output: 3 }, model: "test" }) };
    const result = await intel(provider, "task", "context");
    assert.equal(result.intelligence.summary, "found");
    assert.deepEqual(result.intelligence.relevant_files, ["src/index.js"]);
    assert.equal(result.tokens.output, 3);
  });

  it("returns failed evidence with a nonzero VERIFY_CMD.sh", () => {
    const repo = fs.mkdtempSync(path.join(os.tmpdir(), "minitok-verify-"));
    fs.writeFileSync(path.join(repo, "VERIFY_CMD.sh"), "exit 7\n");
    const result = verifyCommand(repo, { command: process.execPath, args: ["-e", "process.exit(7)"], script_path: "VERIFY_CMD.sh" });
    assert.equal(result.passed, false);
    assert.equal(result.evidence.exit_code, 7);
    assert.equal(result.evidence.status, "failed");
    fs.rmSync(repo, { recursive: true, force: true });
  });

  it("requires VERIFY_CMD.sh when no script exists", () => {
    const result = verifyCommand(process.cwd(), { script_path: "missing-VERIFY_CMD.sh" });
    assert.equal(result.passed, false);
    assert.equal(result.evidence.status, "missing");
    assert.equal(result.evidence.exit_code, 1);
  });

  it("passes when the configured gate command exits zero", () => {
    const repo = fs.mkdtempSync(path.join(os.tmpdir(), "minitok-verify-"));
    fs.writeFileSync(path.join(repo, "VERIFY_CMD.sh"), "exit 0\n");
    const result = verifyCommand(repo, { command: process.execPath, args: ["-e", "process.exit(0)"], script_path: "VERIFY_CMD.sh" });
    assert.equal(result.passed, true);
    assert.equal(result.evidence.exit_code, 0);
    fs.rmSync(repo, { recursive: true, force: true });
  });

  it("builds a repair task from review and check failures", () => {
    const task = buildRepairTask("original goal", { summary: "bad change", findings: [{ severity: "error", message: "fix this" }] }, { evidence: { command: "npm test", output: "failed test" } });
    assert.match(task, /original goal/);
    assert.match(task, /fix this/);
    assert.match(task, /failed test/);
  });
});
