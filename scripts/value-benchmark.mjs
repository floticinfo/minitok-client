import fs from "node:fs";
import path from "node:path";

function usage() {
  console.error("Usage: node scripts/value-benchmark.mjs <baseline.json> <minitok.json> [report.json]");
  console.error("Each file must contain: runs, successful_runs, duration_minutes, total_tokens, total_cost_usd, manual_interventions");
  process.exit(2);
}

function readMetrics(file) {
  const value = JSON.parse(fs.readFileSync(file, "utf8"));
  const required = ["runs", "successful_runs", "duration_minutes", "total_tokens", "total_cost_usd", "manual_interventions"];
  for (const key of required) {
    if (!Number.isFinite(value[key]) || value[key] < 0) throw new Error(`${file}: ${key} must be a non-negative number`);
  }
  if (!Number.isInteger(value.runs) || !Number.isInteger(value.successful_runs) || value.runs <= 0 || value.successful_runs > value.runs) throw new Error(`${file}: runs and successful_runs are invalid`);
  return value;
}

function summarize(value) {
  return {
    runs: value.runs,
    success_rate: value.successful_runs / value.runs,
    avg_duration_minutes: value.duration_minutes / value.runs,
    avg_tokens: value.total_tokens / value.runs,
    avg_cost_usd: value.total_cost_usd / value.runs,
    avg_manual_interventions: value.manual_interventions / value.runs,
  };
}

const [baselineFile, minitokFile, reportFile] = process.argv.slice(2);
if (!baselineFile || !minitokFile) usage();
try {
  const baseline = summarize(readMetrics(baselineFile));
  const minitok = summarize(readMetrics(minitokFile));
  const delta = {
    success_rate_points: (minitok.success_rate - baseline.success_rate) * 100,
    duration_reduction_pct: (1 - minitok.avg_duration_minutes / baseline.avg_duration_minutes) * 100,
    token_reduction_pct: (1 - minitok.avg_tokens / baseline.avg_tokens) * 100,
    cost_reduction_pct: (1 - minitok.avg_cost_usd / baseline.avg_cost_usd) * 100,
    manual_intervention_reduction_pct: baseline.avg_manual_interventions === 0
      ? null
      : (1 - minitok.avg_manual_interventions / baseline.avg_manual_interventions) * 100,
  };
  const report = { baseline, minitok, delta, evidence: { source: "operator-supplied measurements", synthetic: false } };
  const output = JSON.stringify(report, null, 2);
  if (reportFile) fs.writeFileSync(path.resolve(reportFile), `${output}\n`, "utf8");
  console.log(output);
} catch (error) {
  console.error(`Benchmark failed: ${error.message}`);
  process.exit(1);
}
