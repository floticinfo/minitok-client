"use strict";
const { cmdCheckout } = require("./checkout");
const { cmdPortal } = require("./portal");
const { cmdActivationKey } = require("./activation-key");

function register(program) {
  const billing = program.command("billing").description("Manage billing and subscription access");
  billing.command("checkout").description("Alias for checkout").option("--token <jwt>", "Customer JWT (required)").option("--plan <planId>", "Plan to purchase (open|select|private)", "open").option("--server <url>", "minitok server URL").action(async options => { process.exit(await cmdCheckout(options)); });
  billing.command("portal").description("Alias for portal").option("--token <jwt>", "Customer JWT (required)").option("--server <url>", "minitok server URL").action(async options => { process.exit(await cmdPortal(options)); });
  billing.command("activation-key").description("Alias for activation-key").option("--token <jwt>", "Customer JWT (required)").option("--payment <id>", "Optional dodo_payment_id").option("--server <url>", "minitok server URL").action(async options => { process.exit(await cmdActivationKey(options)); });
}

module.exports = { register };
