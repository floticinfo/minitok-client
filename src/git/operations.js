"use strict";

/**
 * Git operations — wraps git CLI for repo analysis.
 * Uses execFileSync (no shell) to prevent command injection.
 */

const { execFileSync } = require("child_process");

/**
 * Execute a git command safely using execFileSync (no shell interpretation).
 * @param {string} repoRoot
 * @param {string[]} args - git arguments as array
 * @returns {string}
 */
function git(repoRoot, args) {
  try {
    return execFileSync("git", args, {
      cwd: repoRoot,
      encoding: "utf-8",
      timeout: 30000,
      stdio: ["pipe", "pipe", "pipe"],
    }).trim();
  } catch {
    return "";
  }
}

function isGitRepo(repoRoot) {
  const r = git(repoRoot, ["rev-parse", "--is-inside-work-tree"]);
  return r === "true";
}

function currentBranch(repoRoot) {
  return git(repoRoot, ["branch", "--show-current"]);
}

function headCommit(repoRoot) {
  return git(repoRoot, ["rev-parse", "--short", "HEAD"]);
}

function status(repoRoot) {
  return git(repoRoot, ["status", "--porcelain"]);
}

function diffStat(repoRoot) {
  return git(repoRoot, ["diff", "--stat"]);
}

function logRecent(repoRoot, count = 10) {
  return git(repoRoot, ["log", "--oneline", `-${count}`]);
}

function remoteUrl(repoRoot) {
  return git(repoRoot, ["remote", "get-url", "origin"]);
}

function fileCount(repoRoot) {
  const output = git(repoRoot, ["ls-files"]);
  return output ? output.split("\n").length : 0;
}

function stagedFiles(repoRoot) {
  const output = git(repoRoot, ["diff", "--cached", "--name-only"]);
  return output ? output.split("\n").filter(Boolean) : [];
}

function commit(repoRoot, message) {
  return git(repoRoot, ["commit", "-m", String(message)]);
}

function addAll(repoRoot) {
  return git(repoRoot, ["add", "-A"]);
}

function hasUncommittedChanges(repoRoot) {
  return status(repoRoot).length > 0;
}

module.exports = {
  git,
  isGitRepo,
  currentBranch,
  headCommit,
  status,
  diffStat,
  logRecent,
  remoteUrl,
  fileCount,
  stagedFiles,
  commit,
  addAll,
  hasUncommittedChanges,
};
