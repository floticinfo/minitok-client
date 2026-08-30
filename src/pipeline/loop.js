"use strict";

/**
 * Autonomous loop — orchestrates plan → implement → verify → iterate.
 */

const fs = require("fs");
const path = require("path");
const providerModule = require("../llm/provider");
const { loadConfig, resolveProviderName } = require("../config/loader");
const { intel } = require("./intel");
const { plan } = require("./planner");
const { implement, applyChanges } = require("./implementer");
const { verify } = require("./verifier");
const { verifyCommand } = require("./check");
const { buildRepairTask } = require("./repair");
const { writeContract, writeContextManifest } = require("../state/contracts");
const { recordRunEvidence } = require("../run-evidence");
const { generateNextTask } = require("./next_task");
const { compactText, DEFAULT_CONTEXT_BUDGET_CHARS } = require("../context/compaction");
const { KnowledgeStore } = require("../evolution/knowledge");
const { analyzeFailurePatterns } = require("../evolution/analyzer");
const { recommendPolicy } = require("../evolution/policy");
const { uploadEvolutionOutcome } = require("../evolution/upload");
const { resolveServerUrl } = require("../cli/commands/server-config");
const git = require("../git/operations");
const readline = require("readline");

const os = require("os");

const INSTALLATION_TOKEN_FILE = path.join(os.homedir(), ".minitok", "entitlement", "installation-token.json");

/**
 * Read the stored installation token (from minitok activate).
 * @returns {{ token: string, serverUrl: string } | null}
 */
function _loadUploadCredentials() {
  try {
    const data = fs.readFileSync(INSTALLATION_TOKEN_FILE, "utf-8");
    const parsed = JSON.parse(data);
    if (!parsed.token || typeof parsed.token !== "string") return null;
    const serverUrl = resolveServerUrl();
    return { token: parsed.token, serverUrl };
  } catch {
    return null;
  }
}

function getRepoContext(repoRoot, maxFiles = 50) {
  const lines = [];
  lines.push(`Repository: ${repoRoot}`);
  lines.push(`Branch: ${git.currentBranch(repoRoot) || "unknown"}`);
  lines.push(`Commit: ${git.headCommit(repoRoot) || "unknown"}`);
  lines.push(`Files: ${git.fileCount(repoRoot)}`);
  const recent = git.logRecent(repoRoot, 5);
  if (recent) lines.push(`Recent:\n${recent}`);

  // Read key files
  const keyFiles = ["package.json", "pyproject.toml", "README.md", "minitok.yml", "Cargo.toml", "go.mod"];
  for (const f of keyFiles) {
    const fp = path.join(repoRoot, f);
    if (fs.existsSync(fp)) {
      try {
        const content = fs.readFileSync(fp, "utf-8").slice(0, 2000);
        lines.push(`\n--- ${f} ---\n${content}`);
      } catch {}
    }
  }
  return lines.join("\n");
}

function compactContext(repoContext, budgetChars) {
  const result = compactText(repoContext, { budget_chars: budgetChars });
  if (result.compacted) {
    console.log(`  📦 Context compacted: ${result.original_chars} → ${result.final_chars} chars`);
  }
  return result.text;
}

/**
 * Prompt user for confirmation of file changes.
 * Returns true if accepted, false if rejected.
 */
async function promptConfirmation(changesResult, opts) {
  // dry-run never needs confirmation
  if (opts.dryRun) return true;

  // auto-accept flag skips confirmation
  if (opts.autoAccept) return true;

  const changes = changesResult.changes || [];
  if (changes.length === 0) return true;

  // Non-TTY: auto-accept with warning
  if (!process.stdin.isTTY) {
    console.warn("⚠️  No TTY detected. Auto-accepting file changes. Use --auto-accept explicitly in CI.");
    return true;
  }

  // Display changes to user
  console.log("\n📝 Proposed file changes:");
  for (const c of changes) {
    const icon = c.action === "create" ? "➕" : c.action === "delete" ? "🗑️" : "✏️";
    console.log(`   ${icon} ${c.action}: ${c.file}`);
  }
  console.log("");

  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stderr });
    rl.question("   Accept these changes? [y/N] ", (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === "y" || answer.toLowerCase() === "yes");
    });
  });
}

async function runPipelineInWorkspace(task, opts = {}) {
  const startTime = Date.now();
  const config = loadConfig(opts.configPath, opts.overrides);
  const repoRoot = opts.repoRoot || process.cwd();

  if (!git.isGitRepo(repoRoot)) {
    throw new Error(`Not a git repository: ${repoRoot}`);
  }

  writeContract(repoRoot, { status: "running", goal: task, verify_command: config.validation?.script_path || "VERIFY_CMD.sh" });

  // Entitlement gate — must pass before any LLM/provider work
  let gateResult = null;
  const devMode = process.env.MINITOK_DEV_MODE === "1" && process.env.NODE_ENV !== "production";
  if (devMode) {
    console.warn("⚠️  MINITOK_DEV_MODE=1 — entitlement gate bypassed for local development only.");
  } else if (!opts.skipEntitlementCheck) {
    const { checkEntitlementOnline } = require("../entitlement/online");
    const { GateState } = require("../entitlement/gate");
    gateResult = await checkEntitlementOnline({ entitlementDir: opts.entitlementDir, serverUrl: opts.serverUrl || resolveServerUrl() });
    if (!gateResult.allowed) {
      console.error(`\n🚫 Entitlement check failed: ${gateResult.message}`);
      if (gateResult.state === GateState.OFFLINE_GRACE) {
        console.warn("   Offline grace mode is temporary. Connect to the internet to renew.");
      }
      throw new Error(`Entitlement ${gateResult.state}: ${gateResult.message}`);
    }
    if (gateResult.state === GateState.OFFLINE_GRACE) {
      console.warn(`⚠️  ${gateResult.message}`);
    }
  }

  const providersConfig = config.providers || {};
  const configuredProviderNames = Object.keys(providersConfig);
  const defaultProvider = config.default_provider || configuredProviderNames[0] || "";
  const ALIAS_MAP = { claude: "anthropic", gpt: "openai", gemini: "google" };
  const createRoleProvider = (role) => {
    const providerName = resolveProviderName(config, role, opts.providerOverride) || defaultProvider;
    if (!providerName) throw new Error(`No provider configured for role '${role}'. Configure default_provider or providers.`);
    const canonicalName = ALIAS_MAP[providerName] || providerName;
    const provider = providerModule.createProvider(providerName, providersConfig[canonicalName] || providersConfig[providerName] || {});
    return { name: providerName, provider };
  };
  const roleProviders = {};
  for (const role of ["plan", "work", "review", "intel"]) {
    roleProviders[role] = createRoleProvider(role);
    if (!(await roleProviders[role].provider.isAvailable())) {
      throw new Error(`Provider '${roleProviders[role].name}' for role '${role}' is not available. Configure its credentials or choose another provider.`);
    }
  }

  const hardCycleLimit = Math.max(1, Number(config.budget.max_cycles_hard_limit) || 100);
  const hardTokenLimit = Math.max(1, Number(config.budget.token_hard_limit) || 2000000);
  const maxCyclesSetting = config.budget.max_cycles;
  const maxCycles = maxCyclesSetting === "unlimited" || maxCyclesSetting === 0 || maxCyclesSetting == null ? Infinity : Math.min(Number(maxCyclesSetting) || 1, hardCycleLimit);
  const tokenSetting = config.budget.token_budget;
  const tokenBudget = tokenSetting === "unlimited" || tokenSetting === 0 || tokenSetting == null ? Infinity : Math.min(Number(tokenSetting) || 1, hardTokenLimit);
  const originalGoal = task;
  const hardTimeoutMs = (Number(config.execution.timeout_hard_limit_sec) || 86400) * 1000;
  const deadline = Date.now() + hardTimeoutMs;
  const budgetChars = config.execution?.context_budget_chars || DEFAULT_CONTEXT_BUDGET_CHARS;
  const results = { cycles: [], totalTokens: { input: 0, output: 0 }, goal: originalGoal, evolution: {} };
  let confirmationGranted = false; // Track whether user approved changes for this run
  let stagnantCycles = 0;
  let lastChangeSignature = "";

  // Self-evolution: adapt policy from past outcomes
  const knowledgeStore = new KnowledgeStore(opts.knowledgePath);
  let adaptedMaxCycles = Math.min(maxCycles, hardCycleLimit);
  if (knowledgeStore.size > 0) {
    const patterns = analyzeFailurePatterns(knowledgeStore.getAll());
    if (patterns.patterns.length > 0) {
      const { recommended, reasons } = recommendPolicy(patterns.patterns, {
        max_cycles: Number.isFinite(maxCycles) ? maxCycles : hardCycleLimit,
      });
      if (reasons.length > 0) {
        console.log("  🧬 Adaptive policy:");
        reasons.forEach(r => console.log(`     → ${r}`));
        adaptedMaxCycles = recommended.max_cycles;
      }
    }
  }
  results.evolution.knowledge_size = knowledgeStore.size;

  // Graceful shutdown on SIGINT/SIGTERM
  let _abortRequested = false;
  const _originalSigint = process.listeners("SIGINT").slice();
  const _originalSigterm = process.listeners("SIGTERM").slice();
  const _onSignal = (sig) => {
    _abortRequested = true;
    console.log(`\n⚠️  Received ${sig} — finishing current cycle then stopping...`);
  };
  process.on("SIGINT", _onSignal);
  process.on("SIGTERM", _onSignal);

  try {
  for (let cycle = 1; cycle <= adaptedMaxCycles; cycle++) {
    // Graceful shutdown check
    if (_abortRequested) {
      console.log("🛑 Pipeline interrupted by signal.");
      break;
    }
    if (Date.now() >= deadline) {
      console.log("\n⏱️  Timeout hard limit reached. Stopping.");
      break;
    }
    // 💰 Token budget cap — prevent runaway LLM usage
    const totalUsed = results.totalTokens.input + results.totalTokens.output;
    if (totalUsed >= tokenBudget || totalUsed >= hardTokenLimit) {
      console.log(`\n💰 Token budget reached (${totalUsed.toLocaleString()} / ${tokenBudget.toLocaleString()}). Stopping.`);
      break;
    }

    console.log(`\n🔄 Cycle ${cycle}/${adaptedMaxCycles}`);
    // Context compaction (token savings)
    const rawRepoContext = getRepoContext(repoRoot);
    const repoContext = compactContext(rawRepoContext, budgetChars);
    writeContextManifest(repoRoot, { goal: task, source: "pipeline", budget_chars: budgetChars, original_chars: rawRepoContext.length, final_chars: repoContext.length, files: ["package.json", "README.md", "minitok.yml"].filter(file => fs.existsSync(path.join(repoRoot, file))) });

    // Build per-role provider options (model + reasoning/thinking)
    const roleOpts = (role) => {
      const r = config.roles[role] || {};
      const opts = { model: r.model };
      // Reasoning/thinking: pass to provider based on adapter type
      if (r.reasoning) opts.reasoning_effort = r.reasoning;    // OpenAI o1/o3/GPT-5.6
      if (r.reasoning) opts.thinking = r.reasoning;             // Anthropic adaptive thinking
      if (r.effort) opts.effort = r.effort;                     // Anthropic effort level
      if (r.thinking_budget) opts.thinking = { enabled: true, budget_tokens: r.thinking_budget };
      return opts;
    };

    console.log("  🧭 Gathering repository intelligence...");
    const intelResult = await intel(roleProviders.intel.provider, task, repoContext, roleOpts("intel"));
    results.totalTokens.input += intelResult.tokens?.input || 0;
    results.totalTokens.output += intelResult.tokens?.output || 0;

    // Phase 2: Plan
    console.log("  📋 Planning...");
    const planResult = await plan(roleProviders.plan.provider, task, repoContext, { ...roleOpts("plan"), intelligence: intelResult.intelligence });
    results.totalTokens.input += planResult.tokens?.input || 0;
    results.totalTokens.output += planResult.tokens?.output || 0;
    console.log(`     Plan: ${planResult.plan.error ? "❌ " + planResult.plan.error : "✅ " + (planResult.plan.steps?.length || 0) + " steps"}`);

    if (planResult.plan.error) {
      results.cycles.push({ cycle, plan: planResult.plan, status: "plan_failed" });
      continue;
    }

    // Phase 3: Implement
    console.log("  🔧 Implementing...");
    const implResult = await implement(roleProviders.work.provider, planResult, repoContext, roleOpts("work"));
    results.totalTokens.input += implResult.tokens?.input || 0;
    results.totalTokens.output += implResult.tokens?.output || 0;

    if (implResult.changes.error) {
      console.log(`     Implement: ❌ ${implResult.changes.error}`);
      results.cycles.push({ cycle, plan: planResult.plan, implement: implResult.changes, status: "impl_failed" });
      continue;
    }

    // Apply changes — require user confirmation on first file modification
    let applyResult;
    if (confirmationGranted || opts.dryRun) {
      // Already confirmed this run, or dry-run (no mutation)
      applyResult = applyChanges(repoRoot, implResult.changes, opts.dryRun);
    } else {
      const accepted = await promptConfirmation(implResult.changes, opts);
      if (!accepted) {
        console.log("  ❌ Changes rejected by user. Stopping pipeline.");
        results.cycles.push({ cycle, plan: planResult.plan, implement: implResult.changes, status: "rejected_by_user" });
        break;
      }
      confirmationGranted = true;
      applyResult = applyChanges(repoRoot, implResult.changes, opts.dryRun);
    }
    console.log(`     Applied: ${applyResult.applied} changes${applyResult.errors.length ? `, ${applyResult.errors.length} errors` : ""}`);

    // Phase 4: Check
    console.log("  🧪 Running verification command...");
    const checkResult = opts.dryRun ? { passed: true, evidence: { status: "skipped", command: "dry-run", output: "" } } : verifyCommand(repoRoot, { script_path: config.validation?.script_path, timeout_ms: config.validation?.timeout_ms });

    // Phase 5: Review
    console.log("  🔍 Reviewing...");
    const verifyResult = await verify(roleProviders.review.provider, task, { changes: implResult.changes, check: checkResult }, repoRoot, roleOpts("review"));
    results.totalTokens.input += verifyResult.tokens?.input || 0;
    results.totalTokens.output += verifyResult.tokens?.output || 0;
    const reviewVerdict = verifyResult.review.verdict || "UNKNOWN";
    const checkPassed = checkResult.passed;
    const verdict = checkPassed ? reviewVerdict : "REJECT";
    const icon = verdict === "APPROVE" ? "✅" : "❌";
    console.log(`     Review: ${icon} ${verdict} (confidence: ${verifyResult.review.confidence || "N/A"})`);

    const changeSignature = JSON.stringify({ status: verdict, files: implResult.changes?.changes?.map(change => change.file) || [] });
    if (changeSignature === lastChangeSignature || !(implResult.changes?.changes || []).length) stagnantCycles += 1;
    else stagnantCycles = 0;
    lastChangeSignature = changeSignature;
    if (stagnantCycles >= (config.budget.stagnation_limit || 3)) {
      console.log(`\n🛑 Stagnation limit reached (${stagnantCycles} cycles). Stopping.`);
      break;
    }

    results.cycles.push({
      cycle,
      intelligence: intelResult.intelligence,
      plan: planResult.plan,
      implement: { summary: implResult.changes.summary, files_changed: implResult.changes.files_changed, changed_files: (implResult.changes.changes || []).map(change => change.file) },
      check: checkResult.evidence,
      review: verifyResult.review,
      verify: verifyResult.review,
      tokens: {
        input: (intelResult.tokens?.input || 0) + (planResult.tokens?.input || 0) + (implResult.tokens?.input || 0) + (verifyResult.tokens?.input || 0),
        output: (intelResult.tokens?.output || 0) + (planResult.tokens?.output || 0) + (implResult.tokens?.output || 0) + (verifyResult.tokens?.output || 0),
      },
      status: verdict,
    });

    // If approved, goal-directed: check if overall goal is achieved
    if (verdict === "APPROVE" && (verifyResult.review.confidence || 0) >= 0.8) {
      if (cycle < adaptedMaxCycles && !opts.dryRun) {
        console.log("  🧠 Evaluating goal progress...");
        const nextResult = await generateNextTask(roleProviders.plan.provider, originalGoal, results.cycles, verifyResult.review, roleOpts("plan"));
        results.totalTokens.input += nextResult.tokens?.input || 0;
        results.totalTokens.output += nextResult.tokens?.output || 0;
        if (nextResult.done) {
          console.log(`  ✅ Goal achieved: ${nextResult.summary || "All objectives met"}`);
          break;
        } else if (nextResult.next_task) {
          console.log(`  📌 Next task: ${nextResult.next_task}`);
          task = nextResult.next_task;
        }
      } else {
        console.log("\n✅ Task completed successfully!");
        break;
      }
    }

    // Phase 6: Repair
    if (verdict === "REJECT") {
      console.log("  🔧 Preparing repair task...");
      task = buildRepairTask(originalGoal, verifyResult.review, checkResult);
    }
  }
  } catch (error) {
    writeContract(repoRoot, { status: "failed", goal: originalGoal, verify_command: config.validation?.script_path || "VERIFY_CMD.sh", error: error.message });
    throw error;
  } finally {
    // Restore original signal handlers
    process.removeListener("SIGINT", _onSignal);
    process.removeListener("SIGTERM", _onSignal);
    _originalSigint.forEach(h => process.on("SIGINT", h));
    _originalSigterm.forEach(h => process.on("SIGTERM", h));
  }

  const elapsed = Date.now() - startTime;
  const success = results.cycles.some(c => c.status === "APPROVE");

  // Self-evolution: record outcome
  const totalTokens = results.totalTokens.input + results.totalTokens.output;
  knowledgeStore.record({
    goal: originalGoal,
    status: success ? "success" : "failure",
    cycles: results.cycles.length,
    total_tokens: totalTokens,
    duration_ms: elapsed,
    files_changed: results.cycles.reduce((sum, c) => sum + (c.implement?.files_changed || 0), 0),
    summary: `${results.cycles.length} cycles, ${success ? "success" : "failure"}`,
  });
  results.evolution.knowledge_size = knowledgeStore.size;

  // M14: Attempt evolution upload (non-blocking, errors swallowed).
  // Only sanitized telemetry is sent — never goal/summary/project data.
  // uploadEvolutionOutcome enforces: entitlement → feature → opt-in → sanitize → network.
  // If ANY check fails, no network request is made. Upload failure never affects project execution.
  const uploadOutcome = {
    status: success ? "success" : "failure",
    cycles: results.cycles.length,
    duration_ms: elapsed,
    files_changed: results.cycles.reduce((sum, c) => sum + (c.implement?.files_changed || 0), 0),
    total_tokens: totalTokens,
    failure_category: undefined,
  };
  try {
    const creds = _loadUploadCredentials();
    const uploadResult = await uploadEvolutionOutcome(uploadOutcome, {
      _entitlementCheck: gateResult || undefined,
      serverUrl: opts.serverUrl || creds?.serverUrl || undefined,
      token: opts.installationToken || creds?.token || undefined,
    });
    results.evolution.upload = uploadResult.sent ? "sent" : "skipped";
  } catch {
    results.evolution.upload = "error";
  }

  const elapsedSec = (elapsed / 1000).toFixed(1);
  console.log(`\n📊 Summary: ${results.cycles.length} cycles, ${totalTokens.toLocaleString()} tokens (${results.totalTokens.input.toLocaleString()} in + ${results.totalTokens.output.toLocaleString()} out), ${elapsedSec}s`);
  console.log(`🧬 Evolution: ${knowledgeStore.size} outcomes recorded`);

  results.success = success;
  writeContract(repoRoot, { status: success ? "completed" : "failed", goal: originalGoal, verify_command: config.validation?.script_path || "VERIFY_CMD.sh", cycles: results.cycles.length, success });
  try {
    await recordRunEvidence({
      workspaceRoot: repoRoot,
      task: originalGoal,
      dry_run: Boolean(opts.dryRun),
      stages: {
        selected_plan: results.cycles.at(-1)?.plan || null,
        work: results.cycles.at(-1)?.implement || null,
        review: results.cycles.at(-1)?.review || null,
      },
      changed_files: results.cycles.flatMap(c => c.implement?.changed_files || []),
      verification: {
        commands: results.cycles.map(c => c.check?.command).filter(Boolean),
        exit_status: results.cycles.at(-1)?.check?.exit_code ?? null,
        passed: results.cycles.at(-1)?.check?.status === "passed",
      },
      outcome: success ? "success" : "verification-failed",
    });
  } catch (error) {
    console.warn(`⚠️  Could not save run evidence: ${error.message}`);
  }
  return results;
}

async function runPipeline(task, opts = {}) {
  if (opts.isolatedWorkspace) return runPipelineInWorkspace(task, opts);
  const { createIsolatedWorkspace, applyWorkspaceDiff, removeIsolatedWorkspace } = require("../workspace/isolation");
  const repoRoot = opts.repoRoot || process.cwd();
  if (!git.isGitRepo(repoRoot)) throw new Error(`Not a git repository: ${repoRoot}`);
  const isolated = createIsolatedWorkspace(repoRoot, opts.isolationRoot);
  try {
    const result = await runPipelineInWorkspace(task, { ...opts, repoRoot: isolated.path, isolatedWorkspace: true });
    if (result.success && !opts.dryRun) applyWorkspaceDiff(repoRoot, isolated.path);
    return { ...result, isolation: { path: isolated.path, applied: result.success && !opts.dryRun } };
  } finally {
    removeIsolatedWorkspace(isolated.path);
  }
}

module.exports = { runPipeline, runPipelineInWorkspace, getRepoContext, compactContext, promptConfirmation };
