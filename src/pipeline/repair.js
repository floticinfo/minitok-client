"use strict";

function buildRepairTask(originalGoal, review, check) {
  const findings = (review?.findings || []).map(f => `- [${f.severity || "error"}] ${f.message || "issue"}`).join("\n");
  const verification = check?.evidence ? `\nVerification command: ${check.evidence.command}\nVerification output:\n${check.evidence.output}` : "";
  return `${originalGoal}\n\nRepair the failed implementation. Address every review finding and verification failure before making changes.\n\nReview summary: ${review?.summary || "No review summary"}\nFindings:\n${findings || "- Verification failed; inspect the command output."}${verification}`;
}

module.exports = { buildRepairTask };
