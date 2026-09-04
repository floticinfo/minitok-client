"use strict";

const { WorkspaceManager } = require("../../workspace/manager");
const { loadConfig, resolveProviderName } = require("../../config/loader");
const { detectAvailableProviders } = require("../../llm/provider");
const { minitokVersion } = require("../../core/version");
const git = require("../../git/operations");
const path = require("path");
const { authorizeEntitlement } = require("../../entitlement/policy");
const { resolveServerUrl } = require("./server-config");
const { EvolutionOptIn } = require("../../evolution/optin");

async function cmdStatus() {
  console.log(`minitok ${minitokVersion}\n`);

  // --- Entitlement section ---
  try {
    const gate = await authorizeEntitlement();
    console.log(`Entitlement: ${gate.state}`);
    // checkEntitlement returns the verified payload directly on gate.entitlement.
    const payload = gate.entitlement && gate.entitlement.payload ? gate.entitlement.payload : gate.entitlement;
    if (payload) {
      if (payload.plan_id) console.log(`  Plan:       ${payload.plan_id}`);
      if (payload.expires_at) console.log(`  Expires:    ${payload.expires_at}`);
      if (payload.max_devices) console.log(`  Max Devices: ${payload.max_devices}`);
    }
    if (gate.graceDaysRemaining) {
      console.log(`  Grace:      ${gate.graceDaysRemaining} day(s) remaining`);
    }
    console.log(`  Server:     ${resolveServerUrl()}`);
    // M11: Evolution upload status
    try {
      const evoOptIn = new EvolutionOptIn();
      const evoEnabled = evoOptIn.isEnabled();
      const hasFeature = gate.entitlement?.features?.includes("evolution_upload") || false;
      if (evoEnabled && hasFeature) {
        console.log(`  Evolution:  upload ENABLED`);
      } else if (evoEnabled && !hasFeature) {
        console.log(`  Evolution:  opt-in ON but feature unavailable`);
      } else {
        console.log(`  Evolution:  upload OFF (local evolution active)`);
      }
    } catch {
      console.log(`  Evolution:  upload OFF`);
    }
    console.log("");
  } catch {
    console.log("Entitlement: UNKNOWN (error reading entitlement)\n");
  }

  // --- Workspace section ---
  const wm = new WorkspaceManager();
  const ws = wm.currentWorkspace();

  if (!ws) {
    console.log("No workspace set.\nRun: minitok workspace add .");
    return 0;
  }

  console.log(`Workspace:  ${ws.name}`);
  console.log(`Repository: ${ws.repository_root}`);
  console.log(`Type:       ${ws.project_type}`);
  console.log(`Last used:  ${ws.last_used || "never"}`);

  if (git.isGitRepo(ws.repository_root)) {
    console.log(`\nGit:`);
    console.log(`  Branch:   ${git.currentBranch(ws.repository_root) || "detached"}`);
    console.log(`  Commit:   ${git.headCommit(ws.repository_root) || "unknown"}`);
    console.log(`  Files:    ${git.fileCount(ws.repository_root)}`);
    const statusOutput = git.status(ws.repository_root);
    if (statusOutput) {
      const lines = statusOutput.split("\n").filter(Boolean);
      console.log(`  Changes:  ${lines.length} uncommitted`);
    } else {
      console.log(`  Changes:  clean`);
    }
  }

  const config = loadConfig(path.join(ws.repository_root, "minitok.yml"));
  const providers = await detectAvailableProviders(config);
  console.log(`\nProviders: ${providers.length > 0 ? providers.join(", ") : "none detected"}`);
  console.log(`Roles:`);
  for (const [role] of Object.entries(config.roles)) {
    console.log(`  ${role.padEnd(8)} → ${resolveProviderName(config, role) || "unset"}`);
  }

  return 0;
}

module.exports = { cmdStatus };
