"use strict";

/**
 * Autonomous loop — orchestrates plan → implement → verify → iterate.
 */

const providerModule = require("../llm/provider");
const { loadConfig } = require("../config/loader");
const { plan } = require("./planner");
const { implement, applyChanges } = require("./implementer");
const { verify } = require("./verifier");
const { generateNextTask } = require("./next_task");
const { compactText, DEFAULT_CONTEXT_BUDGET_CHARS } = require("../context/compaction");
const { KnowledgeStore } = require("../evolution/knowledge");
const { analyzeFailurePatterns } = require("../evolution/analyzer");
const { recommendPolicy } = require("../evolution/policy");
const { uploadEvolutionOutcome } = require("../evolution/upload");
const { resolveServerUrl } = require("../cli/commands/server-config");
const git = require("../git/operations");
const readline = require("readline");

const fs = require("fs");
const path = require("path");
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

  // Entitlement gate — must pass before any LLM/provider work
  let gateResult = null;
  if (!opts.skipEntitlementCheck) {
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

  // Resolve provider — alias to canonical name for config lookup
  const ALIAS_MAP = { claude: "anthropic", gpt: "openai", gemini: "google" };
  const providerName = opts.providerOverride || config.roles.plan.adapter;
  const canonicalName = ALIAS_MAP[providerName] || providerName;
  const provider = providerModule.createProvider(providerName, config.providers?.[canonicalName] || {});
  if (!provider.isAvailable()) {
    throw new Error(`Provider '${providerName}' is not available. Set the appropriate API key (ANTHROPIC_API_KEY, OPENAI_API_KEY, or GOOGLE_API_KEY).`);
  }

  const maxCycles = config.budget.max_cycles || 3;
  const tokenBudget = config.budget.token_budget || 500000; // 500K tokens default cap
  const originalGoal = task;
  const budgetChars = config.execution?.context_budget_chars || DEFAULT_CONTEXT_BUDGET_CHARS;
  const results = { cycles: [], totalTokens: { input: 0, output: 0 }, goal: originalGoal, evolution: {} };
  let confirmationGranted = false; // Track whether user approved changes for this run

  // Self-evolution: adapt policy from past outcomes
  const knowledgeStore = new KnowledgeStore(opts.knowledgePath);
  let adaptedMaxCycles = maxCycles;
  if (knowledgeStore.size > 0) {
    const patterns = analyzeFailurePatterns(knowledgeStore.getAll());
    if (patterns.patterns.length > 0) {
      const { recommended, reasons } = recommendPolicy(patterns.patterns, {
        max_cycles: maxCycles,
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
    // 💰 Token budget cap — prevent runaway LLM usage
    const totalUsed = results.totalTokens.input + results.totalTokens.output;
    if (totalUsed >= tokenBudget) {
      console.log(`\n💰 Token budget reached (${totalUsed.toLocaleString()} / ${tokenBudget.toLocaleString()}). Stopping.`);
      break;
    }

    console.log(`\n🔄 Cycle ${cycle}/${adaptedMaxCycles}`);
    // Context compaction (token savings)
    const repoContext = compactContext(getRepoContext(repoRoot), budgetChars);

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

    // Phase 1: Plan
    console.log("  📋 Planning...");
    const planResult = await plan(provider, task, repoContext, roleOpts("plan"));
    results.totalTokens.input += planResult.tokens?.input || 0;
    results.totalTokens.output += planResult.tokens?.output || 0;
    console.log(`     Plan: ${planResult.plan.error ? "❌ " + planResult.plan.error : "✅ " + (planResult.plan.steps?.length || 0) + " steps"}`);

    if (planResult.plan.error) {
      results.cycles.push({ cycle, plan: planResult.plan, status: "plan_failed" });
      continue;
    }

    // Phase 2: Implement
    console.log("  🔧 Implementing...");
    const implResult = await implement(provider, planResult, repoContext, roleOpts("work"));
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

    // Phase 3: Verify
    console.log("  🔍 Verifying...");
    const verifyResult = await verify(provider, task, implResult.changes, repoRoot, roleOpts("review"));
    results.totalTokens.input += verifyResult.tokens?.input || 0;
    results.totalTokens.output += verifyResult.tokens?.output || 0;
    const verdict = verifyResult.review.verdict || "UNKNOWN";
    const icon = verdict === "APPROVE" ? "✅" : verdict === "REJECT" ? "❌" : "⚠️";
    console.log(`     Review: ${icon} ${verdict} (confidence: ${verifyResult.review.confidence || "N/A"})`);

    results.cycles.push({
      cycle,
      plan: planResult.plan,
      implement: { summary: implResult.changes.summary, files_changed: implResult.changes.files_changed },
      verify: verifyResult.review,
      tokens: {
        input: (planResult.tokens?.input || 0) + (implResult.tokens?.input || 0) + (verifyResult.tokens?.input || 0),
        output: (planResult.tokens?.output || 0) + (implResult.tokens?.output || 0) + (verifyResult.tokens?.output || 0),
      },
      status: verdict,
    });

    // If approved, goal-directed: check if overall goal is achieved
    if (verdict === "APPROVE" && (verifyResult.review.confidence || 0) >= 0.8) {
      if (cycle < adaptedMaxCycles && !opts.dryRun) {
        console.log("  🧠 Evaluating goal progress...");
        const nextResult = await generateNextTask(provider, originalGoal, results.cycles, verifyResult.review, roleOpts("plan"));
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

    // If rejected, iterate with feedback
    if (verdict === "REJECT") {
      console.log("  ↻ Changes rejected, will retry...");
      task = `${originalGoal}\n\nPrevious attempt was REJECTED. Review feedback:\n${verifyResult.review.summary || ""}\nFindings:\n${(verifyResult.review.findings || []).map((f) => `- [${f.severity}] ${f.message}`).join("\n")}`;
    }
  }
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
  return results;
}

async function runPipeline(task, opts = {}) {
  if (opts.isolatedWorkspace) return runPipelineInWorkspace(task, opts);
  const { createIsolatedWorkspace, applyWorkspaceDiff, removeIsolatedWorkspace } = require("../workspace/isolation");
  const repoRoot = opts.repoRoot || process.cwd();
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
