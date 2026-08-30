"use strict";

const { execSync } = require("child_process");
const fs = require("fs");
const os = require("os");
const { minitok_VERSION } = require("../../core/version");
const { detectAvailableProviders } = require("../../llm/provider");
const { loadConfig, resolveProviderName } = require("../../config/loader");

function check(name, ok, detail = "") {
  const icon = ok ? "✅" : "❌";
  console.log(`  ${icon} ${name}${detail ? " — " + detail : ""}`);
  return ok;
}

async function cmdDoctor() {
  console.log(`minitok ${minitok_VERSION} — Environment Check\n`);

  let allOk = true;

  // Node.js version
  const nodeVersion = process.version;
  const major = parseInt(nodeVersion.slice(1), 10);
  allOk = check("Node.js", major >= 20, `${nodeVersion} (requires >=20.0.0)`);

  // npm
  try {
    const npmVer = execSync("npm --version", { encoding: "utf-8", timeout: 5000 }).trim();
    allOk = check("npm", true, npmVer) && allOk;
  } catch {
    allOk = check("npm", false, "not found") && allOk;
  }

  // git
  try {
    const gitVer = execSync("git --version", { encoding: "utf-8", timeout: 5000 }).trim();
    allOk = check("git", true, gitVer.replace("git version ", "")) && allOk;
  } catch {
    allOk = check("git", false, "not found") && allOk;
  }

  // ~/.minitok
  const minitokHome = require("path").join(os.homedir(), ".minitok");
  allOk = check("~/.minitok directory", fs.existsSync(minitokHome), minitokHome) && allOk;

  // Config
  const config = loadConfig();
  const providers = await detectAvailableProviders(config);

  // LLM providers
  console.log("\nLLM Providers:");
  allOk = check("Anthropic", providers.includes("anthropic"), providers.includes("anthropic") ? "configured" : "ANTHROPIC_API_KEY not set") && allOk;
  allOk = check("OpenAI", providers.includes("openai"), providers.includes("openai") ? "configured" : "OPENAI_API_KEY not set") && allOk;
  allOk = check("Google", providers.includes("google"), providers.includes("google") ? "configured" : "GOOGLE_API_KEY not set") && allOk;
  allOk = check("OpenRouter", providers.includes("openrouter"), providers.includes("openrouter") ? "configured" : "OPENROUTER_API_KEY not set") && allOk;

  console.log(`\nRoles:`);
  for (const [role, cfg] of Object.entries(config.roles)) {
    const providerName = resolveProviderName(config, role);
    const providerOk = providers.includes(providerName) || cfg.adapter === "mock";
    allOk = check(`  ${role}`, providerOk, `provider=${providerName || "unset"}${providerOk ? "" : " (provider not available)"}`) && allOk;
  }

  console.log(`\n${allOk ? "✅ All checks passed" : "⚠️  Some checks failed — see above"}`);
  return allOk ? 0 : 1;
}

module.exports = { cmdDoctor };
