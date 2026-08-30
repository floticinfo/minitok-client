"use strict";

const fs = require("fs");
const path = require("path");
const git = require("../../git/operations");
const { WorkspaceManager } = require("../../workspace/manager");

const minitok_YML = `# minitok configuration
# See docs/ARCHITECTURE.md for full schema reference.

project:
  name: "{{PROJECT_NAME}}"
  stack: generic

roles:
  plan:
    adapter: claude
    effort: medium
  review:
    adapter: claude
    effort: medium
  work:
    adapter: claude
    effort: medium
  intel:
    adapter: claude
    effort: medium

budget:
  token_budget: 500000
  max_cycles: 3

execution:
  max_retries: 3
  timeout_sec: 600
  research_enabled: true

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

  // Create .minitok directory
  fs.mkdirSync(minitokDir, { recursive: true });

  // Create minitok.yml if not exists
  if (!fs.existsSync(configPath)) {
    const content = minitok_YML.replace("{{PROJECT_NAME}}", projectName);
    fs.writeFileSync(configPath, content, "utf-8");
    console.log(`Created minitok.yml`);
  } else {
    console.log(`minitok.yml already exists, skipping`);
  }

  // Create .gitignore entries if needed
  const gitignorePath = path.join(resolved, ".gitignore");
  const entries = [".minitok/", "minitok-evidence/"];
  let gitignoreContent = "";
  if (fs.existsSync(gitignorePath)) {
    gitignoreContent = fs.readFileSync(gitignorePath, "utf-8");
  }
  for (const entry of entries) {
    if (!gitignoreContent.includes(entry)) {
      gitignoreContent += `\n${entry}`;
    }
  }
  fs.writeFileSync(gitignorePath, gitignoreContent.trim() + "\n", "utf-8");

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

  console.log(`\n✅ Repository initialized as minitok workspace:`);
  console.log(`  name:        ${ws.name}`);
  console.log(`  repository:  ${ws.repository_root}`);
  console.log(`  project:     ${ws.project_type}`);
  console.log(`\nNext steps:`);
  console.log(`  1. Edit minitok.yml to configure roles and providers`);
  console.log(`  2. Set API keys: ANTHROPIC_API_KEY, OPENAI_API_KEY, or GOOGLE_API_KEY`);
  console.log(`  3. Run: minitok doctor`);
  console.log(`  4. Run: minitok run "your task description"`);

  return 0;
}

module.exports = { cmdMigrate };
