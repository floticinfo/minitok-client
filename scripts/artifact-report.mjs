import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const extensionRoot = path.join(root, "extension");
const runtimeRoot = path.join(extensionRoot, "runtime");
const artifactsRoot = path.join(extensionRoot, "artifacts");
const readJson = file => JSON.parse(readFileSync(file, "utf8"));
const relative = file => path.relative(root, file).replaceAll(path.sep, "/");
const sha256 = bytes => createHash("sha256").update(bytes).digest("hex");

function filesUnder(directory) {
  if (!existsSync(directory)) return [];
  const result = [];
  for (const entry of readdirSync(directory, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory() && entry.name !== "node_modules") result.push(...filesUnder(file));
    else if (entry.isFile()) result.push(file);
  }
  return result;
}

function npmCommand(args, cwd = root) {
  if (process.platform === "win32") return execFileSync(process.env.ComSpec || "cmd.exe", ["/d", "/s", "/c", `npm ${args.join(" ")}`], { cwd, encoding: "utf8" });
  return execFileSync("npm", args, { cwd, encoding: "utf8" });
}

function parseNpmJson(output) {
  const start = output.indexOf("[");
  const end = output.lastIndexOf("]");
  if (start < 0 || end < start) throw new Error("npm pack dry-run did not return JSON");
  return JSON.parse(output.slice(start, end + 1))[0];
}

function extensionCandidates() {
  const locations = [extensionRoot, artifactsRoot];
  return locations.flatMap(directory => existsSync(directory) ? readdirSync(directory, { withFileTypes: true }).filter(entry => entry.isFile() && entry.name.endsWith(".vsix")).map(entry => path.join(directory, entry.name)) : []).sort((a, b) => relative(a).localeCompare(relative(b)));
}

export function inspectCliDryRun() {
  const packageJson = readJson(path.join(root, "package.json"));
  const artifact = parseNpmJson(npmCommand(["pack", "--dry-run", "--json"]));
  return { program: "cli-npm-package", status: "generated", verificationStatus: "unverified", source: "git worktree", manifest: { name: packageJson.name, version: packageJson.version, main: packageJson.main, bin: packageJson.bin, engines: packageJson.engines, files: packageJson.files }, dryRun: { filename: artifact.filename, size: artifact.size, unpackedSize: artifact.unpackedSize, shasum: artifact.shasum || null, integrity: artifact.integrity || null, files: (artifact.files || []).map(file => file.path).sort() } };
}

export function inspectRuntime() {
  const packageJson = readJson(path.join(runtimeRoot, "package.json"));
  const files = filesUnder(runtimeRoot).map(file => ({ path: relative(file), size: statSync(file).size, sha256: sha256(readFileSync(file)) }));
  const entrypoint = path.join(runtimeRoot, "src", "runtime", "stdio-entry.js");
  const status = existsSync(entrypoint) ? "generated" : "missing";
  return { program: "mcp-stdio-package-runtime", status, verificationStatus: "unverified", missingStatus: "missing", source: "extension/runtime", manifest: { name: packageJson.name, version: packageJson.version, type: packageJson.type, main: packageJson.main, bin: packageJson.bin, engines: packageJson.engines }, entrypoint: relative(entrypoint), files };
}

export function inspectHttpContract() {
  const server = readFileSync(path.join(root, "src", "runtime", "server.js"), "utf8");
  const stdio = readFileSync(path.join(root, "src", "runtime", "stdio.js"), "utf8");
  const packageJson = readJson(path.join(root, "package.json"));
  const host = server.match(/const HOST = "([^"]+)"/)?.[1];
  const protocol = stdio.match(/const SUPPORTED_PROTOCOLS = \[(.*?)\]/)?.[1]?.replaceAll('"', "").trim();
  if (!host || !protocol) throw new Error("MCP HTTP contract metadata is unavailable");
  return { program: "mcp-localhost-http-contract", status: "generated", verificationStatus: "unverified", source: "git worktree", manifest: { name: packageJson.name, version: packageJson.version }, contract: { host, endpoint: "POST /mcp", protocolVersion: protocol, authentication: "Bearer runtime token", health: "GET /health", remoteHttp: false, contentType: "application/json", unauthorizedStatus: 401, notificationStatus: 202 }, sources: ["src/runtime/server.js", "src/runtime/stdio.js"] };
}

export function inspectExtensionArtifacts() {
  const packageJson = readJson(path.join(extensionRoot, "package.json"));
  const canonical = `minitok-extension-${packageJson.version}.vsix`;
  const candidates = extensionCandidates().map(file => ({ path: relative(file), status: path.basename(file) === canonical && path.dirname(file) === artifactsRoot ? "generated" : "stale", size: statSync(file).size, sha256: sha256(readFileSync(file)) }));
  const authoritative = candidates.find(candidate => candidate.path === `extension/artifacts/${canonical}`);
  const status = authoritative ? "generated" : "missing";
  return { program: "vscode-extension-vsix", status, verificationStatus: "unverified", staleReportStatus: "stale", missingStatus: "missing", staleStatus: "stale", authoritative: `extension/artifacts/${canonical}`, candidates, manifest: { name: packageJson.name, displayName: packageJson.displayName, version: packageJson.version, publisher: packageJson.publisher, engines: packageJson.engines } };
}

export function inspectExtensionArtifact(artifact) {
  const packageJson = readJson(path.join(extensionRoot, "package.json"));
  const bytes = readFileSync(artifact);
  return { program: "vscode-extension-vsix", status: "generated", verificationStatus: "unverified", source: "git worktree", manifest: { name: packageJson.name, displayName: packageJson.displayName, version: packageJson.version, publisher: packageJson.publisher, engines: packageJson.engines }, artifact: { path: relative(artifact), sha256: sha256(bytes), size: bytes.length } };
}

if (path.resolve(process.argv[1] || "") === path.resolve(fileURLToPath(import.meta.url))) {
  const mode = process.argv[2];
  if (mode === "cli") console.log(JSON.stringify(inspectCliDryRun()));
  else if (mode === "runtime") console.log(JSON.stringify(inspectRuntime()));
  else if (mode === "http") console.log(JSON.stringify(inspectHttpContract()));
  else if (mode === "extension") console.log(JSON.stringify(inspectExtensionArtifacts()));
  else if (mode === "report") console.log(JSON.stringify({ status: "unverified", artifacts: [inspectCliDryRun(), inspectExtensionArtifacts(), inspectRuntime(), inspectHttpContract()] }));
  else throw new Error("usage: node scripts/artifact-report.mjs report|cli|runtime|http|extension");
}
