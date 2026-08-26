#!/usr/bin/env node
"use strict";

/**
 * minitok CLI entry point ??pure Node.js implementation.
 */

const { Command } = require("commander");
const pkg = require("../package.json");

// Ensure UTF-8 on Windows consoles
if (process.platform === "win32") {
  try {
    if (process.stdout.setEncoding) process.stdout.setDefaultEncoding("utf-8");
    if (process.stderr.setEncoding) process.stderr.setDefaultEncoding("utf-8");
  } catch (_) {}
}

const program = new Command();

program
  .name("minitok")
  .description("Repository-aware autonomous coding workflow driver")
  .version(`minitok ${pkg.version}`);

/* status */
program
  .command("status")
  .description("Show current state and metrics")
  .action(async () => {
    const { cmdStatus } = require("../src/cli/commands/status");
    process.exit(await cmdStatus());
  });

/* doctor */
program
  .command("doctor")
  .description("Check environment")
  .action(async () => {
    const { cmdDoctor } = require("../src/cli/commands/doctor");
    process.exit(await cmdDoctor());
  });

/* run */
program
  .command("run")
  .description("Run autonomous cycle loop")
  .argument("[task]", "Task description")
  .option("-w, --workspace <name>", "Workspace name")
  .option("-t, --task-flag <task>", "Alternative task flag")
  .option("--dry-run", "Validate without modifying files", false)
  .option("--auto-accept", "Skip confirmation prompts for autonomous operations", false)
  .option("--repo <path>", "Explicit repository path")
  .option("--provider-override <provider>", "Override all role adapters")
  .option("--coding-adapter <adapter>", "Specific coding adapter")
  .option("--research-adapter <adapter>", "Specific research adapter")
  .option("--review-adapter <adapter>", "Specific review adapter")
  .action(async (taskArg, opts) => {
    const { cmdRun } = require("../src/cli/commands/run");
    const task = taskArg || opts.taskFlag || null;
    process.exit(await cmdRun(task, opts));
  });

/* workspace */
const wsCmd = program.command("workspace").description("Manage workspaces");

wsCmd
  .command("add")
  .description("Register a new workspace")
  .argument("[path]", "Repository path", ".")
  .argument("[name]", "Workspace name")
  .action(async (repoPath, name) => {
    const { cmdWsAdd } = require("../src/cli/commands/workspace");
    process.exit(await cmdWsAdd(repoPath, name));
  });

wsCmd
  .command("list")
  .description("List registered workspaces")
  .action(async () => {
    const { cmdWsList } = require("../src/cli/commands/workspace");
    process.exit(await cmdWsList());
  });

wsCmd
  .command("use")
  .description("Switch current workspace")
  .argument("<name>")
  .action(async (name) => {
    const { cmdWsUse } = require("../src/cli/commands/workspace");
    process.exit(await cmdWsUse(name));
  });

wsCmd
  .command("current")
  .description("Show current workspace")
  .action(async () => {
    const { cmdWsCurrent } = require("../src/cli/commands/workspace");
    process.exit(await cmdWsCurrent());
  });

wsCmd
  .command("remove")
  .description("Remove a workspace")
  .argument("<name>")
  .action(async (name) => {
    const { cmdWsRemove } = require("../src/cli/commands/workspace");
    process.exit(await cmdWsRemove(name));
  });

/* migrate */
program
  .command("migrate")
  .description("Initialize repository as minitok workspace")
  .argument("[path]", "Repository path", ".")
  .option("-n, --name <name>", "Workspace name")
  .action(async (repoPath, opts) => {
    const { cmdMigrate } = require("../src/cli/commands/migrate");
    process.exit(await cmdMigrate(repoPath, opts.name));
  });

/* models */
require("../src/cli/commands/models").register(program);

/* auth */
require("../src/cli/commands/auth").register(program);

/* evolution ??M11 */
require("../src/cli/commands/evolution").register(program);

/* activate */
program
  .command("activate")
  .description("Activate minitok with a license key")
  .argument("<key>", "Activation key")
  .option("--server <url>", "minitok server URL")
  .action(async (key, opts) => {
    const { cmdActivate } = require("../src/cli/commands/activate");
    process.exit(await cmdActivate(key, opts));
  });

/* activation-key */
program
  .command("activation-key")
  .description("Retrieve your activation key (one-time) using your customer JWT")
  .option("--token <jwt>", "Authentication token (JWT)")
  .option("--payment <id>", "Optional dodo_payment_id or stripe_invoice_id")
  .option("--server <url>", "minitok server URL")
  .action(async (opts) => {
    const { cmdActivationKey } = require("../src/cli/commands/activation-key");
    process.exit(await cmdActivationKey(opts));
  });

/* checkout */
program
  .command("checkout")
  .description("Start a Dodo Checkout session to purchase minitok Pro (--stripe for legacy Stripe path)")
  .option("--token <jwt>", "Authentication token (JWT)")
  .option("--plan <planId>", "Plan to purchase (pro)", "pro")
  .option("--server <url>", "minitok server URL")
  .option("--stripe", "Use legacy Stripe checkout endpoint instead of Dodo")
  .action(async (opts) => {
    const { cmdCheckout } = require("../src/cli/commands/checkout");
    process.exit(await cmdCheckout(opts));
  });

/* portal */
program
  .command("portal")
  .description("Open Dodo Customer Portal to manage your subscription (--stripe for legacy Stripe portal)")
  .option("--token <jwt>", "Authentication token (JWT)")
  .option("--server <url>", "minitok server URL")
  .option("--stripe", "Use legacy Stripe portal endpoint instead of Dodo")
  .action(async (opts) => {
    const { cmdPortal } = require("../src/cli/commands/portal");
    process.exit(await cmdPortal(opts));
  });

/* runtime */
const runtimeCmd = program.command("runtime").description("Manage the minitok local runtime");

runtimeCmd
  .command("start")
  .description("Start the minitok local runtime server")
  .option("--port <port>", "Port number", "4578")
  .action(async (opts) => {
    const { cmdRuntimeStart } = require("../src/cli/commands/runtime");
    process.exit(await cmdRuntimeStart({ ...opts, port: parseInt(opts.port, 10) || 4578 }));
  });

runtimeCmd
  .command("stop")
  .description("Stop the minitok local runtime server")
  .action(async () => {
    const { cmdRuntimeStop } = require("../src/cli/commands/runtime");
    process.exit(await cmdRuntimeStop());
  });

runtimeCmd
  .command("status")
  .description("Show minitok runtime status")
  .action(async () => {
    const { cmdRuntimeStatus } = require("../src/cli/commands/runtime");
    process.exit(await cmdRuntimeStatus());
  });

program.parseAsync(process.argv).catch((err) => {
  console.error(`Error: ${err.message}`);
  process.exit(1);
});
