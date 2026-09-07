"use strict";
const fs = require("fs");
const path = require("path");
const { EVIDENCE_DIRECTORY } = require("../run-evidence");

function sessionRoot(repo) { return path.resolve(repo, EVIDENCE_DIRECTORY); }
function listSessions(repo) {
  const root = sessionRoot(repo);
  if (!fs.existsSync(root)) return [];
  return fs.readdirSync(root).filter(name => name.endsWith(".json") && name !== "latest.json").map(name => {
    const artifactPath = path.join(root, name);
    try { return { ...JSON.parse(fs.readFileSync(artifactPath, "utf8")), artifact_path: artifactPath }; } catch { return null; }
  }).filter(Boolean).sort((a, b) => String(b.recorded_at || "").localeCompare(String(a.recorded_at || "")));
}
function getSession(repo, runId) { return listSessions(repo).find(session => session.run_id === runId) || null; }
function sessionSummary(session) { return session ? { run_id: session.run_id, outcome: session.outcome, recorded_at: session.recorded_at, cycles: session.cycles, total_tokens: session.total_tokens, total_cost: session.total_cost, artifact_path: session.artifact_path, patch_path: session.patch_path || session.patchPath || null, checkpoint_path: session.checkpoint_path || session.checkpointPath || null } : null; }
module.exports = { sessionRoot, listSessions, getSession, sessionSummary };
