import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));
const npm = process.platform === "win32" ? process.env.ComSpec || "cmd.exe" : "npm";
const npmArgs = (args) => process.platform === "win32" ? ["/d", "/s", "/c", `npm ${args.join(" ")}`] : args;
try {
  execFileSync(npm, npmArgs(["test"]), { cwd: root, stdio: "inherit" });
  execFileSync(npm, npmArgs(["run", "lint"]), { cwd: root, stdio: "inherit" });
} catch (error) {
  process.exit(typeof error.status === "number" ? error.status : 1);
}
