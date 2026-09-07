#!/usr/bin/env node
"use strict";
const { Command } = require("commander");
const program = new Command();
program.name("minitok-admin").description("Private minitok administrator CLI");
require("../src/admin/cli").register(program);
program.parseAsync(process.argv).catch(error => { console.error("Admin command failed"); process.exit(1); });
