"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { execFileSync } = require("child_process");
const { createIsolatedWorkspace, removeIsolatedWorkspace } = require("./isolation");

test("creates a disposable clone without changing the source", () => {
  const repo = fs.mkdtempSync(path.join(os.tmpdir(), "minitok-isolation-test-"));
  execFileSync("git", ["init"], { cwd: repo });
  execFileSync("git", ["config", "user.email", "test@example.invalid"], { cwd: repo });
  execFileSync("git", ["config", "user.name", "Test"], { cwd: repo });
  fs.writeFileSync(path.join(repo, "file.txt"), "before\n");
  execFileSync("git", ["add", "."], { cwd: repo });
  execFileSync("git", ["commit", "-m", "initial"], { cwd: repo });
  const isolated = createIsolatedWorkspace(repo);
  fs.writeFileSync(path.join(isolated.path, "file.txt"), "after\n");
  assert.equal(fs.readFileSync(path.join(repo, "file.txt"), "utf8"), "before\n");
  removeIsolatedWorkspace(isolated.path);
  assert.equal(fs.existsSync(isolated.path), false);
  fs.rmSync(repo, { recursive: true, force: true });
});
