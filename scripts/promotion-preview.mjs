"use strict";

import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { buildDiscoveryManifest, buildTrustManifest, buildPromotionBundle, writeJson } = require("../src/promotion/manifest.js");

function option(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function outputPath(defaultName) {
  return option("--output") || path.join(process.cwd(), defaultName);
}

function main() {
  const action = process.argv[2] || "bundle";
  let value;
  let defaultName;
  if (action === "discovery") {
    value = buildDiscoveryManifest();
    defaultName = "minitok-discovery.json";
  } else if (action === "trust") {
    value = buildTrustManifest();
    defaultName = "minitok-trust.json";
  } else if (action === "bundle") {
    value = buildPromotionBundle();
    defaultName = "minitok-promotion-bundle.json";
  } else {
    throw new Error("Use one of: discovery, trust, bundle");
  }
  const target = writeJson(outputPath(defaultName), value);
  console.log(JSON.stringify({ status: "preview_only", action, output: target, publication: "operator_submission_required" }, null, 2));
}

try {
  main();
} catch (error) {
  console.error(`Promotion preview failed: ${error.message}`);
  process.exitCode = 1;
}
