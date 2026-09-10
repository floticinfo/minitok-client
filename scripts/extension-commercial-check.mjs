import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const extensionRoot = path.join(root, "extension");
const cliPackage = JSON.parse(readFileSync(path.join(root, "package.json"), "utf8"));
const extensionPackage = JSON.parse(readFileSync(path.join(extensionRoot, "package.json"), "utf8"));

function runVsce(args) {
  return execFileSync(process.platform === "win32" ? process.env.ComSpec || "cmd.exe" : "npx", process.platform === "win32" ? ["/d", "/c", `npx vsce ${args.join(" ")}`] : ["vsce", ...args], { cwd: extensionRoot, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
}

const errors = [];
const warnings = [];
const requiredHttps = ["homepage", "repository.url", "bugs.url"];
for (const field of requiredHttps) {
  const value = field.split(".").reduce((current, key) => current?.[key], extensionPackage);
  if (typeof value !== "string" || !/^https:\/\//i.test(value)) errors.push(`${field} must be an HTTPS URL`);
}
if (extensionPackage.license !== "SEE LICENSE IN LICENSE") errors.push("extension license metadata must point to LICENSE");
if (!existsSync(path.join(extensionRoot, "LICENSE"))) errors.push("extension LICENSE file is missing");
if (extensionPackage.minitok?.cliPackage !== cliPackage.name || extensionPackage.minitok?.cliVersion !== cliPackage.version) errors.push("extension CLI compatibility metadata does not match the canonical CLI");
if (!extensionPackage.publisher || !extensionPackage.name || !extensionPackage.version) errors.push("extension Marketplace identity is incomplete");
if (extensionPackage.publisher !== extensionPackage.publisher.trim()) errors.push("extension publisher is not normalized");
if (!extensionPackage.categories?.length || !extensionPackage.keywords?.length) errors.push("extension Marketplace discovery metadata is incomplete");
if (!extensionPackage.galleryBanner?.color || !extensionPackage.galleryBanner?.theme) warnings.push("galleryBanner is not configured");
if (!extensionPackage.preview) warnings.push("preview flag is not explicitly declared");

const files = runVsce(["ls", "--no-dependencies"]).split(/\r?\n/).map(line => line.trim()).filter(Boolean);
const forbidden = files.filter(file => /(^|\/)(test|tests|artifacts|\.vscode-test)(\/|$)|\.test\.[cm]?js$|\.vsix$/.test(file) && !/^runtime\/node_modules\//.test(file));
if (forbidden.length) errors.push(...forbidden.map(file => `development file is packaged: ${file}`));
for (const required of ["package.json", "LICENSE", "dist/src/extension.js", "media/minitok.png"]) if (!files.includes(required)) errors.push(`required Marketplace file is missing: ${required}`);

console.log(JSON.stringify({ status: errors.length ? "invalid" : "ready-local", verificationStatus: "local-only", identity: { publisher: extensionPackage.publisher, name: extensionPackage.name, version: extensionPackage.version, cli: `${cliPackage.name}@${cliPackage.version}` }, files, errors, warnings }, null, 2));
if (errors.length) process.exitCode = 1;
