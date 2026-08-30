"use strict";

/**
 * Evolution CLI — manage evolution upload settings.
 *
 * Commands:
 *   minitok evolution status   — show current opt-in state
 *   minitok evolution enable   — enable evolution upload (explicit opt-in)
 *   minitok evolution disable  — disable evolution upload
 *
 * This only controls the LOCAL opt-in state.
 * Upload also requires entitlement + evolution_upload feature on the server.
 */

const { EvolutionOptIn } = require("../../evolution/optin");

function cmdEvolutionStatus() {
  const optIn = new EvolutionOptIn();
  const state = optIn.status();
  if (state.enabled) {
    console.log("Evolution upload: ENABLED");
    if (state.enabled_at) {
      console.log(`  Enabled at: ${state.enabled_at}`);
    }
  } else {
    console.log("Evolution upload: DISABLED (default)");
    if (state.disabled_at) {
      console.log(`  Disabled at: ${state.disabled_at}`);
    }
  }
  console.log("\nNote: Upload also requires an active subscription with evolution_upload feature.");
  return 0;
}

function cmdEvolutionEnable() {
  const optIn = new EvolutionOptIn();
  if (optIn.isEnabled()) {
    console.log("Evolution upload is already enabled.");
    return 0;
  }
  optIn.enable();
  console.log("Evolution upload: ENABLED");
  console.log("\nEvolution telemetry will be uploaded when:");
  console.log("  1. Active subscription with evolution_upload feature");
  console.log("  2. Local opt-in enabled (now)");
  console.log("  3. Sanitized payload passes validation");
  return 0;
}

function cmdEvolutionDisable() {
  const optIn = new EvolutionOptIn();
  if (!optIn.isEnabled()) {
    console.log("Evolution upload is already disabled.");
    return 0;
  }
  optIn.disable();
  console.log("Evolution upload: DISABLED");
  console.log("\nNo evolution data will be uploaded to the server.");
  console.log("Local evolution processing continues normally.");
  return 0;
}

function register(program) {
  const evoCmd = program
    .command("evolution")
    .description("Manage evolution upload settings");

  evoCmd
    .command("status")
    .description("Show evolution upload status")
    .action(async () => {
      process.exit(cmdEvolutionStatus());
    });

  evoCmd
    .command("enable")
    .description("Enable evolution upload (explicit opt-in)")
    .action(async () => {
      process.exit(cmdEvolutionEnable());
    });

  evoCmd
    .command("disable")
    .description("Disable evolution upload")
    .action(async () => {
      process.exit(cmdEvolutionDisable());
    });
}

module.exports = { register, cmdEvolutionStatus, cmdEvolutionEnable, cmdEvolutionDisable };
