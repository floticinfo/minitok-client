"use strict";

const { WorkspaceManager } = require("../../workspace/manager");
const { loadConfig } = require("../../config/loader");
const { runPipeline } = require("../../pipeline/loop");
const path = require("path");

async function cmdRun(task, opts) {
  if (!task) {
    console.error("Error: Task description required.\n\nUsage: minitok run \"Fix authentication bug\"");
    return 1;
  }

  // Resolve repository
  let repoRoot;
  if (opts.repo) {
    repoRoot = path.resolve(opts.repo);
  } else {
    try {
      const wm = new WorkspaceManager();
      const ws = wm.resolve(opts.workspace);
      repoRoot = ws.repository_root;
      console.log(`Workspace: ${ws.name} (${repoRoot})`);
    } catch (e) {
      console.error(`Error: ${e.message}`);
      return 1;
    }
  }

  try {
    const result = await runPipeline(task, {
      repoRoot,
      dryRun: opts.dryRun,
      autoAccept: opts.autoAccept,
      providerOverride: opts.providerOverride,
      codingAdapter: opts.codingAdapter,
      researchAdapter: opts.researchAdapter,
      reviewAdapter: opts.reviewAdapter,
    });

    // Save results — best-effort, never block pipeline on write errors
    try {
      const fs = require("fs");
      const evidenceDir = path.join(repoRoot, ".minitok");
      fs.mkdirSync(evidenceDir, { recursive: true });
      fs.writeFileSync(
        path.join(evidenceDir, "last-run.json"),
        JSON.stringify({ task, timestamp: new Date().toISOString(), ...result }, null, 2),
        "utf-8"
      );
    } catch (writeErr) {
      console.warn(`⚠️  Could not save last-run.json: ${writeErr.message}`);
    }

    // Check actual pipeline outcome — success requires at least one APPROVE
    const exitCode = result.success ? 0 : 1;
    return exitCode;
  } catch (e) {
    console.error(`Pipeline error: ${e.message}`);
    return 1;
  }
}

module.exports = { cmdRun };
