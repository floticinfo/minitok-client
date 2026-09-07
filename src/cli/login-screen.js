"use strict";
const readline = require("readline");
const { authorizeEntitlement } = require("../entitlement/policy");
const { cmdActivate } = require("./commands/activate");

function plainOutput(options = {}, env = process.env) {
  return options.plain === true || options.ascii === true || env.NO_COLOR === "1" || env.MINITOK_NO_COLOR === "1" || env.MINITOK_ASCII === "1" || env.MINITOK_PLAIN === "1";
}

function clearLoginScreen(options = {}, env = process.env, stdout = process.stdout) {
  if (stdout.isTTY && !plainOutput(options, env)) stdout.write("\x1b[2J\x1b[H");
}

function sanitizeEntitlementMessage(value) {
  const text = value instanceof Error ? value.message : String(value || "");
  const redacted = text
    .replace(/\b(?:sk|pk|rk|key|token|secret|password|client_secret)[-_]?[A-Za-z0-9_./+=:-]+\b/gi, "[redacted]")
    .replace(/https?:\/\/[^\s]+/gi, match => {
      try {
        const url = new URL(match);
        url.username = "";
        url.password = "";
        for (const key of [...url.searchParams.keys()]) url.searchParams.set(key, "[redacted]");
        return url.toString();
      } catch {
        return "[redacted-url]";
      }
    })
    .replace(/[\r\n\t]+/g, " ")
    .trim();
  return redacted.slice(0, 240);
}

function entitlementFailureMessage(gate) {
  const detail = sanitizeEntitlementMessage(gate?.message);
  return detail && detail !== "[redacted]" ? `Entitlement check failed: ${detail} Run: minitok activate <license-key>` : "An active paid entitlement is required. Run: minitok activate <license-key>";
}

async function requireEntitlement(options = {}) {
  let gate;
  try {
    gate = await authorizeEntitlement({ serverUrl: options.server });
    if (gate.allowed) return true;
  } catch (error) {
    gate = { message: sanitizeEntitlementMessage(error) };
  }
  if (!process.stdin.isTTY || !process.stdout.isTTY) throw new Error(entitlementFailureMessage(gate));
  clearLoginScreen(options);
  console.log("minitok\n");
  console.log("Sign in to continue");
  console.log(`${entitlementFailureMessage(gate)}\n`);
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const key = await new Promise(resolve => rl.question("License key: ", resolve));
  rl.close();
  if (!key.trim()) throw new Error("A license key is required.");
  const result = await cmdActivate(key.trim(), { server: options.server });
  if (result !== 0) throw new Error("Activation failed. Check the license key and try again.");
  const verified = await authorizeEntitlement({ serverUrl: options.server });
  if (!verified.allowed) throw new Error(`Activation completed but the paid entitlement could not be verified. ${sanitizeEntitlementMessage(verified.message)}`.trim());
  return true;
}

module.exports = { requireEntitlement, plainOutput, clearLoginScreen, sanitizeEntitlementMessage, entitlementFailureMessage };
