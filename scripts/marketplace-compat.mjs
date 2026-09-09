import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const extensionRoot = path.join(root, "extension");
const manifest = JSON.parse(readFileSync(path.join(extensionRoot, "package.json"), "utf8"));

function run(args) {
  return execFileSync(process.platform === "win32" ? process.env.ComSpec || "cmd.exe" : "npx", process.platform === "win32" ? ["/d", "/c", `npx vsce ${args.join(" ")}`] : ["vsce", ...args], { cwd: extensionRoot, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
}

const files = run(["ls", "--no-dependencies"]).split(/\r?\n/).map(line => line.trim()).filter(Boolean);
const forbidden = files.filter(file => !file.startsWith("runtime/node_modules/undici/") && /(^|\/)(test|tests|node_modules|artifacts|\.vscode-test)(\/|$)|\.test\.[cm]?js$|\.vsix$/.test(file));
const required = ["package.json", "dist/src/extension.js", "src/sidebar.html", "media/minitok.png"];
const missing = required.filter(file => !files.includes(file));
const errors = [...forbidden.map(file => `forbidden packaged path: ${file}`), ...missing.map(file => `required packaged path missing: ${file}`)];
console.log(JSON.stringify({ status: errors.length ? "invalid" : "valid", verificationStatus: "local-only", manifest: { name: manifest.name, publisher: manifest.publisher, version: manifest.version, engines: manifest.engines }, files, errors }));
if (errors.length) process.exitCode = 1;
