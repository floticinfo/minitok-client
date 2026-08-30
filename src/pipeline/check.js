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
  const configuredPath = options.script_path || "VERIFY_CMD.sh";
  const scriptPath = getVerifyCommandPath(repoRoot, configuredPath);
  const nodeVerifier = path.resolve(__dirname, "../../scripts/verify.mjs");
  if (configuredPath === "VERIFY_CMD.mjs" || configuredPath === "scripts/verify.mjs") {
    if (!fs.existsSync(nodeVerifier)) return { status: "missing", command: nodeVerifier, output: "Node verification script was not found", duration_ms: 0, exit_code: 1 };
    return runProcess(process.execPath, [nodeVerifier], repoRoot, options);
  }
  if (!fs.existsSync(scriptPath)) {
    return { status: "missing", command: scriptPath, output: "Verification script was not found", duration_ms: 0, exit_code: 1 };
  }
  const command = options.command || "bash";
  const executablePath = process.platform === "win32" && path.isAbsolute(scriptPath)
    ? `/${scriptPath[0].toLowerCase()}${scriptPath.slice(2).replace(/\\/g, "/")}`
    : scriptPath;
  const args = options.args || [executablePath];
  const started = Date.now();
  try {
    const output = execFileSync(command, args, { cwd: repoRoot, encoding: "utf-8", timeout: options.timeout_ms || 120000, stdio: ["ignore", "pipe", "pipe"] });
    return { status: "passed", command: [command, ...args].join(" "), output: output.slice(-4000), duration_ms: Date.now() - started, exit_code: 0 };
  } catch (error) {
    return { status: "failed", command: [command, ...args].join(" "), output: `${error.stdout || ""}${error.stderr || ""}`.slice(-4000), duration_ms: Date.now() - started, exit_code: typeof error.status === "number" ? error.status : 1 };
  }
}

function runProcess(command, args, repoRoot, options = {}) {
  return runProcess(command, args, repoRoot, options);
}

function verifyCommand(repoRoot, options = {}) {
  const evidence = runVerification(repoRoot, options);
  return { passed: evidence.status === "passed" && evidence.exit_code === 0, evidence };
}

module.exports = { runVerification, verifyCommand };
