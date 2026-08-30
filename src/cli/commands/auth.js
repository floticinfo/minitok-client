"use strict";

/**
 * CLI commands for `minitok auth`.
 * Handles interactive login, status display, and logout.
 */

const { TokenStore } = require("../../auth/token-store");
const { OAuthFlow, OAUTH_CONFIGS } = require("../../auth/oauth");
const { saveCustomerToken } = require("../../auth/customer-token");
const readline = require("readline");

const tokenStore = new TokenStore();

/**
 * Prompt user for input via readline.
 * @param {string} question
 * @returns {Promise<string>}
 */
function prompt(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stderr,
  });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

/**
 * Interactive login: opens browser for OAuth or prompts for API key.
 * @param {string} provider - Provider name (anthropic, openai, github, etc.)
 * @returns {Promise<number>} Exit code
 */
async function cmdAuthLogin(provider) {
  if (!provider) {
    console.error("Usage: minitok auth login <provider>");
    console.error("  Providers: anthropic, openai, github, google, azure_ad, openrouter");
    return 1;
  }

  const name = provider.toLowerCase();

  // OAuth providers
  if (OAUTH_CONFIGS[name]) {
    const oauthConfig = OAUTH_CONFIGS[name];
    // Check if client_id is configured
    if (!oauthConfig.client_id) {
      console.log("\n⚠️  OAuth not available: " + oauthConfig.name + " client_id not configured.");
      console.log("   You can:");
      console.log("   1. Set the client ID via environment variable:");
      const envVar = name.toUpperCase().replace("-", "_") + "_CLIENT_ID";
      console.log("      export " + envVar + "=your_client_id");
      console.log("   2. Use API key authentication instead:");
      console.log("      minitok auth login " + name + " (API key mode)");
      console.log("\n💡 API Key fallback:");
      return await cmdApiKeyLogin(name);
    }
    try {
      const oauth = new OAuthFlow();
      const tokens = await oauth.authorize(name);
      tokenStore.save(name, tokens);
      console.log("\n✅ Logged in to " + name + " successfully.");
      return 0;
    } catch (e) {
      console.error("\n⚠️  OAuth login failed: " + e.message);
      console.error("\n💡 Falling back to API key authentication...");
      return await cmdApiKeyLogin(name);
    }
  }

  // API key providers
  const key = await prompt("Enter API key for " + name + ": ");
  if (!key) {
    console.error("No key entered. Aborting.");
    return 1;
  }

  tokenStore.save(name, {
    access_token: key,
    token_type: "api_key",
  });
  console.log("\n✅ API key saved for " + name + ".");
  return 0;
}

/**
 * Show all stored tokens with valid/expired status.
 * @returns {Promise<number>} Exit code
 */
async function cmdAuthStatus() {
  const tokens = tokenStore.list();

  if (tokens.length === 0) {
    console.log("No stored credentials.");
    console.log("\nRun: minitok auth login <provider>");
    return 0;
  }

  console.log("Stored credentials:\n");
  for (const t of tokens) {
    const icon = t.valid ? "✅" : "❌";
    const status = t.valid ? "valid" : "expired";
    const refresh = t.has_refresh ? " (has refresh token)" : "";
    const expiry = t.expires_at ? "  expires: " + t.expires_at : "";
    console.log("  " + icon + " " + t.provider.padEnd(16) + status + refresh + expiry);
  }

  console.log("\nRun: minitok auth login <provider>  to add/update credentials");
  return 0;
}

/**
 * Prompt for API key without OAuth attempt.
 * @param {string} name - Provider name
 * @returns {Promise<number>} Exit code
 */
async function cmdApiKeyLogin(name) {
  const key = await prompt("Enter API key for " + name + ": ");
  if (!key) {
    console.error("No key entered. Aborting.");
    return 1;
  }

  tokenStore.save(name, {
    access_token: key,
    token_type: "api_key",
  });
  console.log("\n✅ API key saved for " + name + ".");
  return 0;
}

/**
 * Remove stored token for a provider.
 * @param {string} provider
 * @returns {Promise<number>} Exit code
 */
async function cmdAuthLogout(provider) {
  if (!provider) {
    console.error("Usage: minitok auth logout <provider>");
    return 1;
  }

  const name = provider.toLowerCase();
  tokenStore.remove(name);
  console.log("Logged out from " + name + ".");
  return 0;
}

/**
 * Register auth subcommands with the CLI program.
 * @param {import('commander').Command} program
 */
function register(program) {
  const authCmd = program
    .command("auth")
    .description("Manage authentication credentials");

  authCmd
    .command("login")
    .description("Log in to a provider (OAuth browser flow or API key)")
    .argument("<provider>", "Provider name (anthropic, openai, github, etc.)")
    .action(async (provider) => {
      process.exit(await cmdAuthLogin(provider));
    });

  authCmd
    .command("status")
    .description("Show stored credentials and their validity")
    .action(async () => {
      process.exit(await cmdAuthStatus());
    });

  authCmd
    .command("logout")
    .description("Remove stored credentials for a provider")
    .argument("<provider>", "Provider name")
    .action(async (provider) => {
      process.exit(await cmdAuthLogout(provider));
    });
}

module.exports = { cmdAuthLogin, cmdAuthStatus, cmdAuthLogout, register };
