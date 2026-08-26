"use strict";

/**
 * Workspace manager — compatible with Python version's workspaces.json.
 * Storage: ~/.minitok/workspaces.json
 */

const fs = require("fs");
const path = require("path");
const os = require("os");
const { WorkspaceError } = require("../core/errors");

const MINITOK_HOME = path.join(os.homedir(), ".minitok");
const WORKSPACES_FILE = "workspaces.json";

const INDICATORS = {
  python: ["pyproject.toml", "setup.py", "setup.cfg", "requirements.txt"],
  node: ["package.json"],
  rust: ["Cargo.toml"],
  go: ["go.mod"],
  java: ["pom.xml", "build.gradle"],
  flutter: ["pubspec.yaml"],
};

function detectProjectType(repoRoot) {
  for (const [type, files] of Object.entries(INDICATORS)) {
    for (const f of files) {
      if (fs.existsSync(path.join(repoRoot, f))) return type;
    }
  }
  return "generic";
}

function isUnder(child, parent) {
  const c = path.resolve(child);
  const p = path.resolve(parent);
  return c === p || c.startsWith(p + path.sep);
}

class WorkspaceManager {
  constructor(minitokHome) {
    this._home = minitokHome || MINITOK_HOME;
    this._file = path.join(this._home, WORKSPACES_FILE);
    this._registry = this._load();
  }

  _load() {
    try {
      const data = fs.readFileSync(this._file, "utf-8");
      return JSON.parse(data);
    } catch {
      return { workspaces: {}, current: null };
    }
  }

  _save() {
    fs.mkdirSync(this._home, { recursive: true });
    const tmp = this._file + ".tmp";
    fs.writeFileSync(tmp, JSON.stringify(this._registry, null, 2), "utf-8");
    fs.renameSync(tmp, this._file);
  }

  add(name, repoRoot) {
    if (this._registry.workspaces[name]) {
      throw new WorkspaceError(`Workspace '${name}' already exists`);
    }
    if (!fs.existsSync(repoRoot) || !fs.statSync(repoRoot).isDirectory()) {
      throw new WorkspaceError(`Path does not exist or is not a directory: ${repoRoot}`);
    }
    const projectType = detectProjectType(repoRoot);
    const wsDir = path.join(repoRoot, ".minitok");
    const ws = {
      name,
      repository_root: path.resolve(repoRoot),
      workspace_directory: wsDir,
      project_type: projectType,
      last_used: null,
      created_at: new Date().toISOString(),
    };
    this._registry.workspaces[name] = ws;
    this._save();
    return ws;
  }

  listAll() {
    return this._registry.workspaces;
  }

  get(name) {
    if (!this._registry.workspaces[name]) {
      throw new WorkspaceError(`Workspace '${name}' not found`);
    }
    return this._registry.workspaces[name];
  }

  use(name) {
    const ws = this.get(name);
    ws.last_used = new Date().toISOString();
    this._registry.current = name;
    this._save();
    return ws;
  }

  remove(name) {
    if (!this._registry.workspaces[name]) {
      throw new WorkspaceError(`Workspace '${name}' not found`);
    }
    delete this._registry.workspaces[name];
    if (this._registry.current === name) {
      this._registry.current = null;
    }
    this._save();
  }

  currentWorkspace() {
    if (!this._registry.current) return null;
    return this._registry.workspaces[this._registry.current] || null;
  }

  resolve(explicitName, cwd) {
    // Priority 1: explicit name
    if (explicitName) return this.get(explicitName);

    // Priority 2: CWD matching
    const resolved = path.resolve(cwd || process.cwd());
    const matches = [];
    for (const ws of Object.values(this._registry.workspaces)) {
      if (isUnder(resolved, ws.repository_root)) {
        matches.push(ws);
      }
    }
    if (matches.length === 1) return matches[0];
    if (matches.length > 1) {
      const names = matches.map((w) => w.name).join(", ");
      throw new WorkspaceError(
        `Ambiguous CWD matches multiple workspaces: ${names}. Use 'minitok workspace use <name>'.`
      );
    }

    // Priority 3: current workspace
    const cur = this.currentWorkspace();
    if (cur) return cur;

    // Priority 4: single workspace
    const all = Object.values(this._registry.workspaces);
    if (all.length === 1) return all[0];

    // Priority 5: nothing
    throw new WorkspaceError(
      "No workspace could be resolved.\n\nRun:\n\n    minitok workspace add .\n"
    );
  }

  get currentName() {
    return this._registry.current;
  }

  get repositoryRoot() {
    const ws = this.currentWorkspace();
    return ws ? ws.repository_root : null;
  }
}

module.exports = { WorkspaceManager, MINITOK_HOME, detectProjectType };
