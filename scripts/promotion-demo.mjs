"use strict";

import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { createDemo } = require("../src/promotion/demo.js");
const { writeJson } = require("../src/promotion/manifest.js");

const index = process.argv.indexOf("--directory");
const directory = index >= 0 ? process.argv[index + 1] : undefined;
const outputIndex = process.argv.indexOf("--output");
const plan = createDemo(directory);
const output = outputIndex >= 0 ? process.argv[outputIndex + 1] : path.join(plan.repository, "minitok-demo-plan.json");
const target = writeJson(output, plan);
console.log(JSON.stringify({ status: plan.status, repository: plan.repository, plan: target, credentials: false, network: false }, null, 2));
