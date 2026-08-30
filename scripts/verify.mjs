import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const command = process.argv[2] || "test";
const npm = process.platform === "win32" ? "npm.cmd" : "npm";
const commands = { test: ["test"], lint: ["run", "lint"] };
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

if (!commands[command]) {
  console.error(`Unknown verifier command: ${command}`);
  process.exit(2);
}

try {
  execFileSync(npm, commands[command], { cwd: root, stdio: "inherit" });
} catch (error) {
  process.exit(typeof error.status === "number" ? error.status : 1);
}
