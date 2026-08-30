# minitok

`@flotic/minitok` is a repository-aware coding workflow CLI. It runs the configured pipeline through repository intelligence, planning, implementation, deterministic verification, review, repair, and knowledge recording.

## Install

```bash
npm install -g @flotic/minitok
```

The current source release is prepared as `1.3.1`. Configure at least one LLM provider in `minitok.yml`; role-specific providers override `default_provider`, and otherwise the first configured provider is used.

## Run

```bash
minitok migrate
minitok run "Add a health check"
```

Every non-dry-run pipeline execution requires a project-root `VERIFY_CMD.sh`. The command must exit with status 0 for the deterministic verification gate to pass; the LLM review is supplementary and cannot replace this gate. `minitok migrate` creates a portable npm/pytest template. On Windows, install Git Bash or WSL so the shell script can run.

Pipeline state is stored under `.minitok/`. Tracked contracts are written to `.minitok/contracts/`; sanitized per-run evidence is written to `.minitok/evidence/runs/`.

## Billing

```bash
minitok auth customer-login user@example.com
minitok checkout
minitok activation-key
minitok portal
```

Customer login stores the JWT in `~/.minitok/entitlement/customer-token.json` with owner-only permissions. `MINITOK_CUSTOMER_TOKEN` or an explicit `--token` can be used instead.

## Privacy

Telemetry is opt-in and remains disabled by default. User prompts, source code, file contents, LLM content, credentials, and repository metadata are not uploaded. See [POLICY.md](./POLICY.md) and [DATA_CLASSIFICATION.md](./DATA_CLASSIFICATION.md).

## Run evidence

Each completed run records sanitized, machine-readable evidence in `.minitok/evidence/runs/<run-id>.json`; `latest.json` points to the most recent run. Evidence records stage summaries, changed files, verification commands and exit status, and final outcome. It does not attest to deployment, payment, entitlement, signing, provider authorization, or Git history changes.
