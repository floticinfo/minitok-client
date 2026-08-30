Insert the following section immediately after the existing run-command documentation:

```markdown
Run evidence
------------
Each completed run records sanitized, machine-readable evidence in the local workspace at `.minitok/evidence/runs/<run-id>.json`; `.minitok/evidence/runs/latest.json` points to the most recent run. Evidence contains the run ID and timestamp, dry-run state, task identifier, selected plan/work/review stages, changed files, verification commands and exit status, and final outcome. Inspect it with your preferred JSON reader.

This is local workspace metadata only. A recorded outcome does not imply successful deployment, payment, entitlement, signing, provider authorization, or Git commit/history activity. Prompts and sensitive credentials are not recorded.
```