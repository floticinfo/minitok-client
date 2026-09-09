import fs from "node:fs";
import path from "node:path";

function fail(message) { console.error(`Benchmark input rejected: ${message}`); process.exit(1); }
const files = process.argv.slice(2);
if (files.length < 2) fail("provide baseline and minitok raw-run JSON files");
const records = files.map(file => JSON.parse(fs.readFileSync(path.resolve(file), "utf8")));
for (const [index, record] of records.entries()) {
  if (record.synthetic === true || record.example === true) fail(`${files[index]} is marked synthetic/example`);
  for (const field of ["model", "provider", "repository_commit", "task", "verification_exit_code", "duration_ms", "total_tokens", "total_cost_usd", "manual_interventions"]) {
    if (!(field in record)) fail(`${files[index]} is missing ${field}`);
  }
  if (record.verification_exit_code !== 0) fail(`${files[index]} did not pass verification`);
}
const report = { status: "valid_input", records: files, baseline: records[0], minitok: records[1], generated_at: new Date().toISOString(), synthetic: false };
console.log(JSON.stringify(report, null, 2));
