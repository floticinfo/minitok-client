import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const command = process.argv[2] || "test";
const npm = process.platform === "win32" ? process.env.ComSpec || "cmd.exe" : "npm";
const commands = { test: ["test"], lint: ["run", "lint"] };
const commandArgs = process.platform === "win32"
  ? (name) => ["/d", "/s", "/c", `npm ${commands[name].join(" ")}`]
  : (name) => commands[name];
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

if (!commands[command]) {
  console.error(`Unknown verifier command: ${command}`);
  process.exit(2);
}

try {
  execFileSync(npm, commandArgs(command), { cwd: root, stdio: "inherit" });
} catch (error) {
  process.exit(typeof error.status === "number" ? error.status : 1);
}
