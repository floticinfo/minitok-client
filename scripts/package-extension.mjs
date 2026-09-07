import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const extensionRoot = path.join(root, "extension");
const outputRoot = path.join(extensionRoot, "artifacts");
const packageJson = JSON.parse(readFileSync(path.join(extensionRoot, "package.json"), "utf8"));
const runtimeManifest = JSON.parse(readFileSync(path.join(extensionRoot, "runtime", "runtime-manifest.json"), "utf8"));
if (runtimeManifest.cliPackage !== packageJson.minitok?.cliPackage || runtimeManifest.cliVersion !== packageJson.minitok?.cliVersion) throw new Error("extension runtime manifest is out of parity with the extension manifest");
const output = path.join(outputRoot, `minitok-extension-${packageJson.version}.vsix`);

mkdirSync(outputRoot, { recursive: true });
for (const directory of [extensionRoot, outputRoot]) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (entry.isFile() && entry.name.endsWith(".vsix") && path.join(directory, entry.name) !== output) rmSync(path.join(directory, entry.name), { force: true });
  }
}
rmSync(output, { force: true });
const outputArgument = path.relative(extensionRoot, output);
execFileSync(process.platform === "win32" ? process.env.ComSpec || "cmd.exe" : "npx", process.platform === "win32" ? ["/d", "/c", `npx vsce package --no-dependencies --out ${outputArgument}`] : ["vsce", "package", "--no-dependencies", "--out", outputArgument], { cwd: extensionRoot, stdio: "inherit" });
const sha256 = createHash("sha256").update(readFileSync(output)).digest("hex");
const stale = [extensionRoot, outputRoot].flatMap(directory => readdirSync(directory, { withFileTypes: true }).filter(entry => entry.isFile() && entry.name.endsWith(".vsix") && path.join(directory, entry.name) !== output).map(entry => path.relative(root, path.join(directory, entry.name)).replaceAll(path.sep, "/"))).sort();
if (stale.length) throw new Error(`stale VSIX artifacts remain: ${stale.join(", ")}`);
console.log(JSON.stringify({ program: "vscode-extension-vsix", status: "generated", source: "git worktree", authoritative: path.relative(root, output).replaceAll(path.sep, "/"), stale, manifest: { name: packageJson.name, displayName: packageJson.displayName, version: packageJson.version, publisher: packageJson.publisher, engines: packageJson.engines }, artifact: { path: path.relative(root, output).replaceAll(path.sep, "/"), sha256 } }));
