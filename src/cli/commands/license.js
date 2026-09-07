"use strict";
const { cmdActivate } = require("./activate");

function register(program) {
  const license = program.command("license").description("Manage local entitlement activation");
  license.command("activate").description("Alias for activate").argument("[key]").option("--key-env <name>", "Read activation key from an environment variable").option("--server <url>").action(async (key, options) => { process.exit(await cmdActivate(key, options)); });
}

module.exports = { register };
