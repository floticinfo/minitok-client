import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

export function verifyArchive(file, expected) {
  const bytes = readFileSync(file);
  const actual = `sha512-${createHash("sha512").update(bytes).digest("base64")}`;
  if (!expected || actual !== expected) throw new Error(`package integrity mismatch: expected ${expected || "missing"}, got ${actual}`);
  return actual;
}

if (process.argv[1] && process.argv[1].endsWith("verify-package.mjs")) {
  try { verifyArchive(process.argv[2], process.argv[3]); console.log("package integrity verified"); } catch (error) { console.error(error.message); process.exitCode = 1; }
}
