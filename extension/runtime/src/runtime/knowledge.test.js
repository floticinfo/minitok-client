"use strict";

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { KnowledgeService } = require("./knowledge");
const { AnalysisService } = require("./analysis");

function fixture() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "minitok-runtime-knowledge-"));
  return { dir, file: path.join(dir, "outcomes.json") };
}

describe("runtime project-scoped knowledge", () => {
  it("filters queries and analysis by project", () => {
    const { dir, file } = fixture();
    try {
      const knowledge = new KnowledgeService(file);
      knowledge.record({ project: "alpha", status: "failure", summary: "test failed" });
      knowledge.record({ project: "beta", status: "success", summary: "completed" });
      const alpha = knowledge.query({ project: "alpha" });
      assert.equal(alpha.total, 1);
      assert.equal(alpha.outcomes[0].project, "alpha");
      const analysis = new AnalysisService(file).analyze("alpha");
      assert.equal(analysis.patterns.length, 1);
      assert.equal(analysis.patterns[0].category, "test");
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
});
