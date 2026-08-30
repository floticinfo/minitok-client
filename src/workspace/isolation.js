"use strict";

const fs = require("fs");
const os = require("os");
const path = require("path");
const { execFileSync } = require("child_process");

function runGit(repo, args) {
  return execFileSync("git", args, { cwd: repo, encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] }).trim();
}

function createIsolatedWorkspace(repoRoot, isolationRoot) {
  const root = isolationRoot || fs.mkdtempSync(path.join(os.tmpdir(), "minitok-isolation-"));
  if (isolationRoot) fs.mkdirSync(root, { recursive: true });
  const workspace = fs.mkdtempSync(path.join(root, "workspace-"));
  try {
    runGit(repoRoot, ["clone", "--no-hardlinks", "--local", repoRoot, workspace]);
    return { path: workspace, mode: "git-clone" };
  } catch (cloneError) {
    fs.rmSync(workspace, { recursive: true, force: true });
    fs.mkdirSync(workspace, { recursive: true });
    fs.cpSync(repoRoot, workspace, { recursive: true, filter: (source) => !source.split(path.sep).includes(".git") });
    runGit(workspace, ["init"]);
    runGit(workspace, ["config", "user.email", "minitok-isolation@invalid"]);
    runGit(workspace, ["config", "user.name", "minitok isolation"]);
    runGit(workspace, ["add", "-A"]);
    runGit(workspace, ["commit", "-m", "isolated workspace baseline"]);
    return { path: workspace, mode: "working-tree-snapshot", cloneError: cloneError.message };
  }
}

function applyWorkspaceDiff(repoRoot, isolatedRoot) {
  runGit(isolatedRoot, ["add", "-A"]);
  const patch = runGit(isolatedRoot, ["diff", "--cached", "--binary"]);
  if (!patch) return { applied: false, files: [] };
  const patchFile = path.join(os.tmpdir(), `minitok-patch-${process.pid}.diff`);
  try {
    fs.writeFileSync(patchFile, patch, "utf8");
    execFileSync("git", ["apply", "--index", "--whitespace=nowarn", patchFile], { cwd: repoRoot, stdio: ["pipe", "pipe", "pipe"] });
    return { applied: true, files: runGit(isolatedRoot, ["diff", "--cached", "--name-only"]).split("\n").filter(Boolean) };
  } finally {
    fs.rmSync(patchFile, { force: true });
  }
}

function removeIsolatedWorkspace(workspacePath) {
  fs.rmSync(workspacePath, { recursive: true, force: true });
}

module.exports = { createIsolatedWorkspace, applyWorkspaceDiff, removeIsolatedWorkspace };
