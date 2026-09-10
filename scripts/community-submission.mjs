import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { buildTrustManifest } = require("../src/promotion/manifest.js");
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const packageData = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
const platformNames = ["mcp-directory", "product-hunt", "hacker-news", "reddit", "linkedin"];
const contentRefs = {
  "mcp-directory": "PROMOTION_KIT.md#MCP-directory-submission",
  "product-hunt": "PROMOTION_KIT.md#Product-Hunt-launch-copy",
  "hacker-news": "PROMOTION_KIT.md#Hacker-News-title-and-text",
  reddit: "PROMOTION_KIT.md#Reddit-post",
  linkedin: "PROMOTION_KIT.md#LinkedIn-post",
};

function argument(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function requestedPlatforms() {
  const value = argument("--platforms");
  if (!value) return platformNames;
  const platforms = value.split(",").map(item => item.trim()).filter(Boolean);
  if (!platforms.length || platforms.some(platform => !platformNames.includes(platform))) {
    throw new Error(`platforms must be selected from: ${platformNames.join(", ")}`);
  }
  return platforms;
}

function buildPreview(platforms) {
  return {
    schemaVersion: 1,
    status: "preview_only",
    generatedAt: new Date().toISOString(),
    package: { name: packageData.name, version: packageData.version },
    authentication: {
      mode: "operator_login_required",
      credentialsRead: false,
      credentialsStored: false,
      note: "Use each platform's official login or OAuth flow at submission time; this tool never handles credentials.",
    },
    publication: {
      automaticSubmission: false,
      operatorApprovalRequired: true,
      platforms: platforms.map(platform => ({ platform, contentRef: contentRefs[platform], state: "ready_for_operator_review" })),
    },
    safety: {
      networkRequests: false,
      externalSideEffects: false,
      tokensIncluded: false,
      unsolicitedPosting: false,
    },
    trust: buildTrustManifest(),
  };
}

if (process.argv.includes("--publish")) {
  console.error("Publication is disabled. Review the generated preview and submit through the platform's official interface.");
  process.exit(2);
}

try {
  const preview = buildPreview(requestedPlatforms());
  const output = argument("--output");
  const text = `${JSON.stringify(preview, null, 2)}\n`;
  if (output) fs.writeFileSync(path.resolve(output), text, "utf8");
  console.log(text);
} catch (error) {
  console.error(`Submission preview failed: ${error.message}`);
  process.exit(1);
}

export { buildPreview };
