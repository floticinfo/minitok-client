import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, rmSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const run = (command, args) => execFileSync(command, args, { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
const git = (...args) => run("git", args).trim();
const packageJson = JSON.parse(readFileSync(path.join(root, "package.json"), "utf8"));
const lockJson = JSON.parse(readFileSync(path.join(root, "package-lock.json"), "utf8"));
const errors = [];
const releaseTag = process.env.RELEASE_TAG;

try {
  const head = git("rev-parse", "HEAD");
  const tree = git("rev-parse", "HEAD^{tree}");
  if (!head || !tree) errors.push("git HEAD/tree identity is unavailable");
  if (git("status", "--porcelain")) errors.push("working tree is not clean");
  const tags = git("tag", "--points-at", "HEAD").split(/\r?\n/).filter(Boolean);
  const expectedTags = [`v${packageJson.version}`, packageJson.version];
  if (!tags.some(tag => expectedTags.includes(tag))) errors.push(`HEAD is not tagged for version ${packageJson.version}`);
  if (releaseTag && !expectedTags.includes(releaseTag)) errors.push(`release ref ${releaseTag} does not match package version ${packageJson.version}`);
  if (lockJson.packages?.[""]?.version !== packageJson.version) errors.push("package-lock version does not match package version");
  const output = run(process.platform === "win32" ? process.env.ComSpec || "cmd.exe" : "npm", process.platform === "win32" ? ["/d", "/s", "/c", "npm pack --json"] : ["pack", "--json"]);
  const artifact = JSON.parse(output)[0];
  const artifactPath = path.join(root, artifact.filename);
  const bytes = readFileSync(artifactPath);
  const digest = createHash("sha256").update(bytes).digest("hex");
  const manifest = artifact.files || [];
  const expected = ["package.json", "src/index.js", "scripts/release-verify.mjs", "scripts/secret-scan.mjs"];
  for (const file of expected) if (!manifest.some(entry => entry.path === file)) errors.push(`npm pack artifact omits ${file}`);
  if (!digest || artifact.size !== bytes.length || artifact.size <= 0) errors.push("npm pack artifact digest or size is invalid");
  if (!artifact.shasum || artifact.integrity === undefined) errors.push("npm pack artifact provenance metadata is missing");
  if (existsSync(artifactPath)) rmSync(artifactPath);
} catch (error) {
  errors.push(error.message);
}

if (errors.length) {
  console.error(`release:verify failed:\n- ${errors.join("\n- ")}`);
  process.exit(1);
}
console.log(`release:verify passed for ${packageJson.name}@${packageJson.version}`);
