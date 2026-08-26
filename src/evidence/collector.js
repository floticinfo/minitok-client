"use strict";

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

function collectEvidence(repoRoot, options = {}) {
  const evidence = { timestamp: new Date().toISOString(), tests: {}, lint: {}, types: {} };

  // Test evidence
  try {
    if (fs.existsSync(path.join(repoRoot, "package.json"))) {
      const output = execSync("npm test 2>&1", { cwd: repoRoot, encoding: "utf-8", timeout: 120000, stdio: ["pipe", "pipe", "pipe"] });
      evidence.tests = { status: "passed", output: output.slice(-2000) };
    } else if (fs.existsSync(path.join(repoRoot, "pyproject.toml"))) {
      const output = execSync("python -m pytest tests/ -q --tb=short 2>&1", { cwd: repoRoot, encoding: "utf-8", timeout: 120000, stdio: ["pipe", "pipe", "pipe"] });
      evidence.tests = { status: output.includes("failed") ? "failed" : "passed", output: output.slice(-2000) };
    } else {
      evidence.tests = { status: "skipped", reason: "No test runner detected" };
    }
  } catch (e) {
    evidence.tests = { status: "error", error: e.message };
  }

  // Lint evidence
  try {
    if (fs.existsSync(path.join(repoRoot, "package.json"))) {
      execSync("npx eslint . --quiet 2>&1", { cwd: repoRoot, encoding: "utf-8", timeout: 60000 });
      evidence.lint = { status: "clean" };
    }
  } catch {
    evidence.lint = { status: "issues_found" };
  }

  return evidence;
}

function saveEvidence(repoRoot, evidence) {
  const evidenceDir = path.join(repoRoot, ".minitok", "evidence");
  fs.mkdirSync(evidenceDir, { recursive: true });
  const filename = `evidence-${Date.now()}.json`;
  fs.writeFileSync(path.join(evidenceDir, filename), JSON.stringify(evidence, null, 2), "utf-8");
  return path.join(evidenceDir, filename);
}

module.exports = { collectEvidence, saveEvidence };
