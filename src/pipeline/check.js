"use strict";

const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

function getVerifyCommandPath(repoRoot, configuredPath) {
  const relativePath = configuredPath || "VERIFY_CMD.sh";
  const scriptPath = path.resolve(repoRoot, relativePath);
  const root = path.resolve(repoRoot);
  if (!(scriptPath === root || scriptPath.startsWith(root + path.sep))) throw new Error("VERIFY_CMD.sh path must stay inside the repository");
  return scriptPath;
}

function runVerification(repoRoot, options = {}) {
  const scriptPath = getVerifyCommandPath(repoRoot, options.script_path);
  if (!fs.existsSync(scriptPath)) {
    return { status: "missing", command: scriptPath, output: "VERIFY_CMD.sh is required and was not found", duration_ms: 0, exit_code: 1 };
  }
  const command = options.command || "bash";
  const args = options.args || [scriptPath];
  const started = Date.now();
  try {
    const output = execFileSync(command, args, { cwd: repoRoot, encoding: "utf-8", timeout: options.timeout_ms || 120000, stdio: ["ignore", "pipe", "pipe"] });
    return { status: "passed", command: [command, ...args].join(" "), output: output.slice(-4000), duration_ms: Date.now() - started, exit_code: 0 };
  } catch (error) {
    return { status: "failed", command: [command, ...args].join(" "), output: `${error.stdout || ""}${error.stderr || ""}`.slice(-4000), duration_ms: Date.now() - started, exit_code: typeof error.status === "number" ? error.status : 1 };
  }
}

function verifyCommand(repoRoot, options = {}) {
  const evidence = runVerification(repoRoot, options);
  return { passed: evidence.status === "passed" && evidence.exit_code === 0, evidence };
}

module.exports = { runVerification, verifyCommand };
