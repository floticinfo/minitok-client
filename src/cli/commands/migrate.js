"use strict";

const fs = require("fs");
const path = require("path");
const git = require("../../git/operations");
const { WorkspaceManager } = require("../../workspace/manager");

const VERIFY_CMD = `import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));
const npm = process.platform === "win32" ? process.env.ComSpec || "cmd.exe" : "npm";
const npmArgs = (args) => process.platform === "win32" ? ["/d", "/s", "/c", "npm " + args.join(" ")] : args;
try {
  execFileSync(npm, npmArgs(["test"]), { cwd: root, stdio: "inherit" });
  execFileSync(npm, npmArgs(["run", "lint"]), { cwd: root, stdio: "inherit" });
} catch (error) {
  process.exit(typeof error.status === "number" ? error.status : 1);
}
`;

const minitok_YML = `# minitok configuration
# Pipeline state is stored under .minitok/contracts/.

project:
  name: "{{PROJECT_NAME}}"
  stack: generic

# Configure at least one provider. It becomes the default for every role.
# Set roles.<role>.provider to override one role.
providers:
  default:
    base_url: ""
    api_key: ""
    models: []

default_provider: default

roles:
  plan:
    provider: ""
    effort: medium
  review:
    provider: ""
    effort: medium
  work:
    provider: ""
    effort: medium
  intel:
    provider: ""
    effort: medium

budget:
  max_cycles: unlimited
  token_budget: unlimited
  max_cycles_hard_limit: 100
  token_hard_limit: 2000000
  stagnation_limit: 3

execution:
  max_retries: unlimited
  timeout_sec: unlimited
  retry_hard_limit: 5
  timeout_hard_limit_sec: 86400
  research_enabled: true

validation:
  enabled: true
  script_path: VERIFY_CMD.mjs
  timeout_ms: 120000

commit:
  enabled: false
  auto_message: true
`;

async function cmdMigrate(repoPath, name) {
  const resolved = path.resolve(repoPath);

  if (!fs.existsSync(resolved)) {
    console.error(`Error: Path does not exist: ${resolved}`);
    return 1;
  }

  if (!git.isGitRepo(resolved)) {
    console.error(`Error: Not a git repository: ${resolved}`);
    console.error("Initialize git first: git init");
    return 1;
  }

  const projectName = name || path.basename(resolved);
  const minitokDir = path.join(resolved, ".minitok");
  const configPath = path.join(resolved, "minitok.yml");
  const verifyPath = path.join(resolved, "VERIFY_CMD.mjs");
  const contractsDir = path.join(minitokDir, "contracts");

  // Create .minitok state and contracts directories
  fs.mkdirSync(contractsDir, { recursive: true });

  // Create minitok.yml if not exists
  if (!fs.existsSync(configPath)) {
    const content = minitok_YML.replace("{{PROJECT_NAME}}", projectName);
    fs.writeFileSync(configPath, content, "utf-8");
    console.log(`Created minitok.yml`);
  } else {
    console.log(`minitok.yml already exists, skipping`);
  }

  if (!fs.existsSync(verifyPath)) {
    fs.writeFileSync(verifyPath, VERIFY_CMD, "utf-8");
    console.log(`Created VERIFY_CMD.mjs`);
  } else {
    console.log(`VERIFY_CMD.mjs already exists, skipping`);
  }

  const gitignorePath = path.join(resolved, ".gitignore");
  const entries = [".minitok/", "minitok-evidence/"];
  const existing = fs.existsSync(gitignorePath) ? fs.readFileSync(gitignorePath, "utf-8") : "";
  const lines = existing.split(/\r?\n/);
  for (const entry of entries) if (!lines.includes(entry)) lines.push(entry);
  const gitignoreContent = lines.filter((line, index, all) => line !== "" || index < all.length - 1).join("\n").replace(/\n*$/, "\n");
  const tempGitignore = `${gitignorePath}.tmp.${process.pid}`;
  fs.writeFileSync(tempGitignore, gitignoreContent, { encoding: "utf-8", flag: "wx" });
  try { fs.renameSync(tempGitignore, gitignorePath); } catch (error) { try { fs.unlinkSync(tempGitignore); } catch {} throw error; }

  // Register workspace
  const wm = new WorkspaceManager();
  const wsName = name || projectName;
  let ws;
  try {
    ws = wm.add(wsName, resolved);
  } catch (e) {
    if (e.message.includes("already exists")) {
      ws = wm.get(wsName);
      console.log(`Workspace '${wsName}' already registered`);
    } else {
      throw e;
    }
  }

  console.log(`\n[ok] Repository initialized as minitok workspace:`);
  console.log(`  name:        ${ws.name}`);
  console.log(`  repository:  ${ws.repository_root}`);
  console.log(`  project:     ${ws.project_type}`);
  console.log(`\nNext steps:`);
  console.log(`  1. Configure one provider in minitok.yml or set ANTHROPIC_API_KEY, OPENAI_API_KEY, GOOGLE_API_KEY, or OPENROUTER_API_KEY`);
  console.log(`  2. Run: minitok doctor`);
  console.log(`  3. Preview safely: minitok run --dry-run "your task description"`);
  console.log(`  4. Run a real task: minitok run "your task description"`);
  console.log(`  5. Review evidence: .minitok/last-run.json`);

  return 0;
}

module.exports = { cmdMigrate };
