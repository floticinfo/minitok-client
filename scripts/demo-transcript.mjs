import { spawn } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = process.argv[2] ? path.resolve(process.argv[2]) : process.cwd();
const task = process.argv.slice(3).join(" ") || "Add a health-check endpoint and tests while preserving the existing API";
const output = process.env.MINITOK_DEMO_OUTPUT ? path.resolve(process.env.MINITOK_DEMO_OUTPUT) : path.join(root, ".minitok", "demo-transcript.txt");
if (path.resolve(root) === path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")) {
  throw new Error("demo target must be a disposable repository, not the minitok source tree");
}
/** @type {[string, string[]][]} */
const commands = [
  ["node", ["--version"]],
  ["npm", ["test"]],
  ["node", [path.resolve("bin/minitok.js"), "doctor"]],
  ["node", [path.resolve("bin/minitok.js"), "migrate", "."]],
  ["node", [path.resolve("bin/minitok.js"), "run", "--dry-run", task]],
  ["node", ["VERIFY_CMD.mjs"]],
  ["git", ["status", "--short"]],
];
const lines = [`minitok demo transcript`, `repository=${root}`, `task=${task}`, `started=${new Date().toISOString()}`];
await mkdir(path.dirname(output), { recursive: true });
for (const entry of commands) {
  const commandName = entry[0];
  const args = entry[1];
  const command = process.platform === "win32" && commandName === "node" ? process.execPath : process.platform === "win32" && commandName === "npm" ? process.env.ComSpec : commandName;
  const spawnArgs = process.platform === "win32" && commandName === "npm" ? ["/d", "/s", "/c", ["npm.cmd", ...args].join(" ")] : args;
  lines.push(`\n$ ${commandName} ${args.join(" ")}`);
  const result = await new Promise(resolve => {
    const child = spawn(command, spawnArgs, { cwd: root, env: process.env });
    let text = "";
    child.stdout?.on("data", chunk => { text += chunk.toString(); process.stdout.write(chunk); });
    child.stderr?.on("data", chunk => { text += chunk.toString(); process.stderr.write(chunk); });
    child.on("error", error => resolve({ code: 1, text: error.message }));
    child.on("close", code => resolve({ code: code ?? 1, text }));
  });
  lines.push(result.text.replaceAll(process.env.USERPROFILE || "", "<HOME>").replaceAll(/(?:Bearer\s+)[^\s]+/gi, "Bearer <REDACTED>").replaceAll(/(?:token|password|api[_-]?key)\s*[:=]\s*[^\s,]+/gi, "$1=<REDACTED>"));
  lines.push(`exit=${result.code}`);
  if (result.code !== 0 && commandName !== "node") break;
}
lines.push(`finished=${new Date().toISOString()}`);
await writeFile(output, `${lines.join("\n")}\n`, "utf8");
console.log(`Transcript written to ${output}`);
