import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
const files = ["README.md", "POLICY.md", "DATA_CLASSIFICATION.md"];
const errors = [];
for (const file of files) {
  const text = fs.readFileSync(path.join(root, file), "utf8");
  if (!text.includes(`v${pkg.version}`) && !text.includes(`version ${pkg.version}`) && !text.includes(`release is \`${pkg.version}\``)) errors.push(`${file}: missing current client version ${pkg.version}`);
}
const policy = fs.readFileSync(path.join(root, "POLICY.md"), "utf8");
const classification = fs.readFileSync(path.join(root, "DATA_CLASSIFICATION.md"), "utf8");
const sanitizer = fs.readFileSync(path.join(root, "src/evolution/sanitize.js"), "utf8");
for (const field of ["status", "cycles", "duration_ms", "files_changed", "total_tokens", "failure_category"]) {
  if (!sanitizer.includes(`${field}:`)) errors.push(`sanitizer: missing ${field}`);
  if (!policy.includes(`\`${field}\``)) errors.push(`POLICY.md: missing ${field}`);
  if (!classification.includes(`\`${field}\``)) errors.push(`DATA_CLASSIFICATION.md: missing ${field}`);
}
for (const value of ["lint", "test", "validation", "type_error", "timeout", "api_error", "unknown"]) {
  if (!sanitizer.includes(`"${value}"`)) errors.push(`sanitizer: missing failure category ${value}`);
  if (!classification.includes(`\`${value}\``)) errors.push(`DATA_CLASSIFICATION.md: missing failure category ${value}`);
}
if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}
console.log(`documentation consistency passed for ${pkg.name}@${pkg.version}`);
