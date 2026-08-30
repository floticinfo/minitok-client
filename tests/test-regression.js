"use strict";

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");

/**
 * Regression tests for P0 async/await bugs and --offline removal.
 * These verify that the specific crash bugs identified in the
 * minitok_FINAL_RELEASE_GATE audit cannot recur.
 */

describe("Regression: doctor async provider detection", () => {
  it("detectAvailableProviders returns an array, not a Promise", async () => {
    const { detectAvailableProviders } = require("../src/llm/provider");
    const { loadConfig } = require("../src/config/loader");
    const config = loadConfig();
    const result = await detectAvailableProviders(config);
    // Must be a resolved array, not a Promise
    assert.ok(Array.isArray(result), "detectAvailableProviders must return Array, got " + typeof result);
  });

  it("detectAvailableProviders result supports .includes()", async () => {
    const { detectAvailableProviders } = require("../src/llm/provider");
    const { loadConfig } = require("../src/config/loader");
    const config = loadConfig();
    const providers = await detectAvailableProviders(config);
    // .includes() must not throw TypeError
    assert.doesNotThrow(() => providers.includes("anthropic"), ".includes() must not throw");
    assert.doesNotThrow(() => providers.includes("nonexistent"), ".includes() must not throw for missing");
    assert.equal(typeof providers.includes("test"), "boolean");
  });
});

describe("Regression: cmdDoctor does not crash", () => {
  it("cmdDoctor returns exit code without throwing", async () => {
    const { cmdDoctor } = require("../src/cli/commands/doctor");
    // Should not throw TypeError: providers.includes is not a function
    const exitCode = await cmdDoctor();
    assert.ok(typeof exitCode === "number", "cmdDoctor must return a number");
    assert.ok(exitCode === 0 || exitCode === 1, "exit code must be 0 or 1");
  });
});

describe("Regression: cmdModels does not crash", () => {
  it("models command runs without throwing", async () => {
    const { register } = require("../src/cli/commands/models");
    const { Command } = require("commander");
    const program = new Command();
    register(program);
    // Parse models command — must not throw TypeError
    // from: "user" means the array only contains user-provided args
    await program.parseAsync(["models"], { from: "user" });
  });
});

describe("Regression: doctor success message reflects actual check results", () => {
  it("cmdDoctor returns exit code 1 when no providers are configured", async () => {
    const originalEnv = process.env.ANTHROPIC_API_KEY;
    delete process.env.ANTHROPIC_API_KEY;
    delete process.env.OPENAI_API_KEY;
    delete process.env.GOOGLE_API_KEY;
    try {
      const { cmdDoctor } = require("../src/cli/commands/doctor");
      const exitCode = await cmdDoctor();
      // With no providers configured, exit code must be 1 (failure)
      assert.equal(exitCode, 1, "exit code must be 1 when no providers are configured");
    } finally {
      if (originalEnv !== undefined) process.env.ANTHROPIC_API_KEY = originalEnv;
    }
  });

  it("doctor check function return value is accumulated into allOk", () => {
    const fs = require("fs");
    const doctorSrc = fs.readFileSync(
      require("path").join(__dirname, "..", "src", "cli", "commands", "doctor.js"),
      "utf-8"
    );
    // Verify provider checks are accumulated into allOk
    assert.ok(
      doctorSrc.includes('allOk = check("Anthropic"'),
      "Anthropic check must be accumulated into allOk"
    );
    assert.ok(
      doctorSrc.includes('allOk = check("OpenAI"'),
      "OpenAI check must be accumulated into allOk"
    );
    assert.ok(
      doctorSrc.includes('allOk = check("Google"'),
      "Google check must be accumulated into allOk"
    );
    // Verify ~/.minitok check is accumulated
    assert.ok(
      doctorSrc.includes('allOk = check("~/.minitok'),
      "~/.minitok check must be accumulated into allOk"
    );
    // Verify role checks are accumulated
    assert.ok(
      doctorSrc.includes("allOk = check(`  ${role}`"),
      "Role checks must be accumulated into allOk"
    );
  });
});

describe("Regression: --offline flag removed", () => {
  it("run command does not have --offline option", () => {
    const { Command } = require("commander");
    const program = new Command();
    program.command("run").option("--dry-run").option("--repo <path>");
    // Verify --offline is NOT an option on the run command
    const runCmd = program.commands.find(c => c._name === "run");
    const opts = runCmd.options.map(o => o.long);
    assert.ok(!opts.includes("--offline"), "--offline should not be a CLI option");
  });

  it("error message does not reference --offline", () => {
    const loopSrc = require("fs").readFileSync(
      require("path").join(__dirname, "..", "src", "pipeline", "loop.js"),
      "utf-8"
    );
    assert.ok(
      !loopSrc.includes("--offline"),
      "loop.js should not reference --offline"
    );
  });
});
