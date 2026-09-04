import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, readdirSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const npmExecPath = process.env.npm_execpath;
const npmCommand = process.platform === "win32" ? process.execPath : (npmExecPath || "npm");
const npmArgs = args => process.platform === "win32"
  ? [npmExecPath || path.join(path.dirname(process.execPath), "node_modules", "npm", "bin", "npm-cli.js"), ...args]
  : args;
const npmNetworkFlags = ["--no-audit", "--no-fund", "--prefer-offline", "--fetch-retries=0", "--fetch-timeout=10000"];
const runNpm = (stage, args) => {
  const started = Date.now();
  process.stderr.write(`[packed-install] ${stage}: start\n`);
  try {
    const output = execFileSync(npmCommand, npmArgs(args), {
      cwd: root,
      encoding: "utf8",
      stdio: "pipe",
      env: { ...process.env, CI: "1", npm_config_audit: "false", npm_config_fund: "false" },
      timeout: 120000,
    });
    process.stderr.write(`[packed-install] ${stage}: passed in ${Date.now() - started}ms\n`);
    return output;
  } catch (error) {
    process.stderr.write(`[packed-install] ${stage}: failed after ${Date.now() - started}ms\n`);
    process.stderr.write(`${error.stdout || ""}${error.stderr || ""}`);
    throw error;
  }
};
const runCli = (cli, consumer, args) => {
  const started = Date.now();
  const stage = `cli ${args.join(" ")}`;
  process.stderr.write(`[packed-install] ${stage}: start\n`);
  try {
    const output = execFileSync(process.execPath, [cli, ...args], { cwd: consumer, encoding: "utf8", stdio: "pipe", env: { ...process.env, CI: "1", MINITOK_UPDATE_CHECK: "0" }, timeout: 30000 });
    process.stderr.write(`[packed-install] ${stage}: passed in ${Date.now() - started}ms\n`);
    return output;
  } catch (error) {
    process.stderr.write(`[packed-install] ${stage}: failed after ${Date.now() - started}ms\n`);
    process.stderr.write(`${error.stdout || ""}${error.stderr || ""}`);
    throw error;
  }
};
const prefix = mkdtempSync(path.join(os.tmpdir(), "minitok-packed-"));
try {
  runNpm("npm pack", ["pack", "--pack-destination", prefix, ...npmNetworkFlags]);
  const archiveName = readdirSync(prefix).find(name => name.endsWith(".tgz"));
  if (!archiveName) throw new Error("npm pack did not produce a tarball");
  const archive = path.join(prefix, archiveName);
  const consumer = path.join(prefix, "consumer");
  mkdirSync(consumer, { recursive: true });
  writeFileSync(path.join(consumer, "package.json"), JSON.stringify({ name: "packed-consumer", private: true }));
  runNpm("npm install", ["install", "--prefix", consumer, "--ignore-scripts", ...npmNetworkFlags, archive]);
  const packageRoot = path.join(consumer, "node_modules", "@flotic", "minitok");
  const cli = path.join(packageRoot, "bin", "minitok.js");
  if (!existsSync(cli)) throw new Error(`packed install did not resolve the package bin: ${cli}`);
  for (const args of [["--help"], ["status"], ["auth", "status"]]) runCli(cli, consumer, args);
} finally {
  rmSync(prefix, { recursive: true, force: true });
}
