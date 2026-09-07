import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { inspectCliDryRun, inspectRuntime, inspectHttpContract, inspectExtensionArtifacts } from "./artifact-report.mjs";
import { validateRegistryMetadata, fetchRegistryMetadata } from "./registry-compat.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const packageJson = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
const extensionPackage = JSON.parse(fs.readFileSync(path.join(root, "extension", "package.json"), "utf8"));

function check(name, status, detail) {
  return { name, status, detail };
}

function local(condition, name, detail) {
  return check(name, condition ? "PASS" : "BLOCKED", detail);
}

function unverified(name, detail) {
  return check(name, "UNVERIFIED", detail);
}

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function has(relativePath, pattern) {
  return pattern.test(read(relativePath));
}

function run(args) {
  const result = spawnSync(process.execPath, [path.join(root, "bin", "minitok.js"), ...args], {
    cwd: root,
    encoding: "utf8",
    env: { ...process.env, MINITOK_UPDATE_CHECK: "0", MINITOK_NO_COLOR: "1" },
  });
  return { ...result, output: `${result.stdout || ""}${result.stderr || ""}` };
}

export function extensionReadiness() {
  const results = [];
  const artifact = inspectExtensionArtifacts();
  const runtime = fs.existsSync(path.join(root, "extension", "dist", "src", "extension.js"));
  results.push(local(runtime, "extension install artifact", "manifest and compiled runtime are present"));
  results.push(local(extensionPackage.main === "./dist/src/extension.js" && /^\d+\.\d+\.\d+$/.test(extensionPackage.version) && extensionPackage.minitok?.cliPackage === packageJson.name && extensionPackage.minitok?.cliVersion === packageJson.version, "extension runtime and version", `${extensionPackage.main} version ${extensionPackage.version}; CLI ${extensionPackage.minitok?.cliPackage}@${extensionPackage.minitok?.cliVersion}`));
  results.push(local(artifact.status === "generated" && artifact.authoritative === `extension/artifacts/minitok-extension-${extensionPackage.version}.vsix`, "extension packaged VSIX", `${artifact.authoritative} is the versioned local artifact`));
  results.push(local(artifact.manifest.name === extensionPackage.name && artifact.manifest.version === extensionPackage.version && artifact.manifest.publisher === extensionPackage.publisher && artifact.manifest.engines?.vscode === extensionPackage.engines?.vscode, "extension VSIX manifest consistency", "VSIX evidence uses the extension manifest identity and engine"));
  results.push(local(extensionPackage.capabilities?.untrustedWorkspaces?.supported === false && /trusted workspace/i.test(extensionPackage.capabilities?.untrustedWorkspaces?.description || ""), "extension trusted-workspace boundary", "untrusted workspaces are explicitly unsupported"));
  results.push(local(has("extension/src/extension.ts", /workspace\.isTrusted/) && has("extension/src/workspace.ts", /Trust this workspace before running minitok/), "extension runtime trust enforcement", "run command refuses untrusted workspaces"));
  results.push(local(has("extension/src/workspace.ts", /MINITOK_MCP_AUTH_TOKEN_FILE/) && has("extension/src/extension.ts", /MCP handshake timed out/) && has("extension/src/extension.ts", /MCP offline/), "extension MCP setup messaging", "token-file setup, timeout, and offline messages are defined"));
  results.push(local(extensionPackage.license === "SEE LICENSE IN LICENSE" && fs.existsSync(path.join(root, "extension", "LICENSE")) && /^https:\/\//i.test(extensionPackage.homepage || "") && /^https:\/\//i.test(extensionPackage.repository?.url || "") && /^https:\/\//i.test(extensionPackage.bugs?.url || ""), "extension commercial metadata", "license, repository, homepage, and issue URLs are complete"));
  results.push(unverified("extension marketplace publication", "local extension files do not prove marketplace publication or compatibility with a published VS Code release"));
  return results;
}

export function cliReadiness() {
  const results = [];
  const help = run(["--help"]);
  const guiHelp = run(["gui", "--help"]);
  const nonTty = run(["gui"]);
  let artifact;
  try { artifact = inspectCliDryRun(); } catch (error) { artifact = { error: error.message, dryRun: { files: [] } }; }
  const packagedFiles = artifact.dryRun?.files || [];
  results.push(local(packageJson.bin?.minitok === "bin/minitok.js" && packageJson.engines?.node === ">=22.19.0", "CLI Node and install contract", `Node ${packageJson.engines?.node}; bin ${packageJson.bin?.minitok}`));
  results.push(local(packagedFiles.includes("bin/minitok.js") && packagedFiles.includes("package.json") && !packagedFiles.some(file => file.includes("tests/")), "CLI packaged npm files", "npm pack dry-run includes runtime files and excludes tests"));
  results.push(local(artifact.manifest?.bin?.minitok === packageJson.bin?.minitok && artifact.manifest?.engines?.node === packageJson.engines?.node, "CLI packaged manifest consistency", "packaged manifest preserves bin and engine metadata"));
  results.push(local(process.platform && /win32|linux|darwin/.test(process.platform), "CLI platform detection", `running on ${process.platform}`));
  results.push(local(help.status === 0 && /--version/.test(help.stdout) && /doctor/.test(help.stdout) && /mcp/.test(help.stdout), "CLI help contract", "top-level help exposes version, diagnostics, and MCP commands"));
  results.push(local(has("bin/minitok.js", /MINITOK_UPDATE_CHECK/) && has("src/core/update-check.js", /MINITOK_UPDATE_CHECK|CI|NO_UPDATE_NOTIFIER/), "CLI update controls", "update checks have explicit disable and CI controls"));
  results.push(local(has("bin/minitok.js", /Error: \$\{e\.message\}/) && guiHelp.status === 0, "CLI actionable error and help", "errors are surfaced and GUI help is available"));
  results.push(local(nonTty.status !== 0 && /Non-TTY usage requires --task or MINITOK_TASK/.test(nonTty.output), "CLI non-TTY contract", "non-TTY GUI use requires an explicit task"));
  results.push(unverified("CLI registry publication and update availability", "local install and update logic do not prove npm publication, registry visibility, or update compatibility"));
  return results;
}

export function mcpReadiness() {
  const results = [];
  const runtime = inspectRuntime();
  const http = inspectHttpContract();
  results.push(local(runtime.status === "generated" && runtime.entrypoint === "extension/runtime/src/runtime/stdio-entry.js", "MCP packaged stdio entrypoint", "runtime artifact contains the stdio entrypoint"));
  results.push(local(runtime.manifest?.main === "src/index.js" && runtime.manifest?.engines?.node === packageJson.engines?.node, "MCP runtime manifest consistency", "runtime manifest preserves package entrypoint and Node engine"));
  results.push(local(fs.existsSync(path.join(root, "src", "runtime", "stdio-entry.js")) && has("src/runtime/stdio.js", /SUPPORTED_PROTOCOLS/), "MCP stdio startup", "packaged stdio entry and protocol negotiation are present"));
  results.push(local(has("src/runtime/stdio.js", /MINITOK_MCP_AUTH_TOKEN_FILE/) && has("src/runtime/stdio.js", /Authentication required/) && has("src/runtime/stdio.js", /this\._sessionToken/), "MCP stdio token-file and session isolation", "token-file loading and session-bound authentication are enforced"));
  results.push(local(http.contract?.host === "127.0.0.1" && http.contract?.endpoint === "POST /mcp" && http.contract?.authentication === "Bearer runtime token", "MCP HTTP localhost and auth contract", "HTTP evidence records loopback binding, MCP endpoint, and bearer authentication"));
  results.push(local(has("src/runtime/server.js", /listen\(this\._port, HOST/) && has("src/runtime/server.js", /POST \/mcp/) && has("src/runtime/server.js", /Bearer/), "MCP HTTP startup and authentication", "localhost HTTP runtime starts /mcp and requires bearer authentication"));
  results.push(local(has("src/runtime/server.js", /_mcpSessions = new Map/) && has("src/runtime/server.js", /Mcp-Session-Id/) && has("src/runtime/server.js", /MCP_SESSION_PATTERN/), "MCP HTTP session isolation", "HTTP sessions are separately identified, bounded, and rejected when invalid"));
  results.push(local(has("src/runtime/server.js", /GET \/metrics/) && has("src/runtime/server.js", /mcp_sessions_created/) && has("src/runtime/server.js", /_runtimeToken/), "MCP operational metrics boundary", "authenticated metrics expose non-secret health counters without credential values"));
  results.push(local(has("src/runtime/stdio.js", /ENTITLEMENT_REQUIRED/) && has("src/runtime/server.js", /entitlement\.status/) && has("src/runtime/server.js", /Entitlement required/), "MCP entitlement boundary", "paid MCP methods fail closed with entitlement errors"));
  results.push(local(has("src/runtime/server.js", /Forbidden: localhost/) && has("src/cli/commands/server-config.js", /Remote http server URLs are not allowed/) && has("src/cli/commands/server-config.js", /https/), "MCP localhost versus remote boundary", "local runtime is loopback-only and remote URLs require HTTPS"));
  results.push(local(has("src/runtime/stdio.js", /Parse error/) && has("src/runtime/stdio.js", /Unsupported protocol version/) && has("src/runtime/server.js", /Content-Type must be application\/json/), "MCP actionable errors", "parse, protocol, and content-type failures identify corrective action"));
  results.push(unverified("MCP remote deployment and production entitlement", "local transport contracts do not prove remote hosting, production authentication, or live entitlement behavior; run npm run readiness:mcp:live for safe public health probes"));
  return results;
}

export function readiness(target = "all") {
  const groups = target === "extension" ? { extension: extensionReadiness() } : target === "cli" ? { cli: cliReadiness() } : target === "mcp" ? { mcp: mcpReadiness() } : { extension: extensionReadiness(), cli: cliReadiness(), mcp: mcpReadiness() };
  return groups;
}

function main() {
  const targetIndex = process.argv.indexOf("--target");
  const target = targetIndex >= 0 ? process.argv[targetIndex + 1] : "all";
  if (!["all", "extension", "cli", "mcp"].includes(target)) {
    console.error("Usage: node scripts/readiness-checks.mjs [--target extension|cli|mcp|all] [--json]");
    process.exit(1);
  }
  const report = readiness(target);
  const checks = Object.values(report).flat();
  if (process.argv.includes("--json")) console.log(JSON.stringify(report, null, 2));
  else {
    for (const [group, groupChecks] of Object.entries(report)) for (const item of groupChecks) console.log(`[${item.status}] ${group} ${item.name}: ${item.detail}`);
    const counts = checks.reduce((summary, item) => ({ ...summary, [item.status]: summary[item.status] + 1 }), { PASS: 0, BLOCKED: 0, UNVERIFIED: 0 });
    console.log(`Summary: PASS=${counts.PASS} BLOCKED=${counts.BLOCKED} UNVERIFIED=${counts.UNVERIFIED}`);
    console.log(`Result: ${counts.BLOCKED ? "BLOCKED" : counts.UNVERIFIED ? "UNVERIFIED" : "PASS"}`);
  }
  process.exitCode = checks.some(item => item.status === "BLOCKED") ? 1 : 0;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main();
