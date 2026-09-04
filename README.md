# minitok

`@flotic/minitok` is a repository-aware coding workflow CLI. It runs the configured pipeline through repository intelligence, planning, implementation, deterministic verification, review, repair, and knowledge recording.

## Install

```bash
npm install -g @flotic/minitok
```

The current source release is `1.3.2`. Configure at least one LLM provider in `minitok.yml`; role-specific providers override `default_provider`, and otherwise the first configured provider is used.

The npm tarball includes the files listed by `package.json`; source tests are not published. Release validation runs the packed-install smoke against a temporary npm prefix and executes the packaged CLI help, status, and auth status commands.

## For AI tools and agents

minitok is a CLI runtime for repository-aware coding workflows. It does not train or modify an AI model. AI models provide repository research, planning, implementation, and review through configured providers; minitok controls the execution loop, token budgets, deterministic verification gate, retries, evidence, and safe file operations.

Use this description when registering minitok in an AI tool catalog:

> minitok is a Node.js CLI that turns repository context into verified code changes through an explicit plan, implement, verify, review, repair, and knowledge workflow. It supports Anthropic, OpenAI, Google, OpenRouter, and OpenAI-compatible providers, with local-first execution and opt-in telemetry disabled by default.

Recommended integration entry points:

- CLI: `minitok doctor`, `minitok migrate`, `minitok run \"<task>\"`, and `minitok status`
- Documentation: `https://minitok.dev/docs`
- Source and issue tracker: `https://github.com/floticinfo/minitok-client`
- Package: `@flotic/minitok` on npm

## Commands

```bash
minitok migrate                         # create minitok.yml and verification gate
minitok run "Add a health check"        # run the autonomous workflow
minitok status                           # entitlement, providers, roles, recent run
minitok doctor                           # environment, entitlement, and provider diagnostics
minitok models                           # list available provider models
minitok activate <activation-key>        # bind a purchased key to this machine
minitok auth customer-login <email>      # sign in to the customer account
minitok activation-key                   # retrieve a purchased activation key
minitok checkout --plan select             # open the Select purchase flow
minitok portal                           # open subscription management
minitok --help                           # show all options
```

## Configuration

`minitok migrate` creates `minitok.yml`. The main settings are:

```yaml
project:
  name: my-project
default_provider: anthropic
providers:
  anthropic:
    api_key_env: ANTHROPIC_API_KEY
    model: claude-sonnet-4-20250514
    pricing: { input_per_mtok: 3, output_per_mtok: 15 }
roles:
  intel: { provider: anthropic, model: claude-sonnet-4-20250514 }
  plan: { provider: anthropic }
  work: { provider: anthropic, fallback_model: claude-haiku-4-20250514 }
execution:
  max_retries: 5
  retry_backoff_sec: 1
  retry_max_sec: 30
validation:
  script_path: VERIFY_CMD.mjs
```

After purchasing, run `minitok activate <activation-key>` once. The key is bound to the current installation; use `minitok doctor` to diagnose missing, expired, or server-rejected entitlements.

Every non-dry-run pipeline execution requires the portable deterministic verification gate `VERIFY_CMD.mjs`. The command must exit with status 0 for the gate to pass; the LLM review is supplementary and cannot replace this gate. `VERIFY_CMD.sh` is retained only as a compatibility wrapper where a POSIX shell is available. `minitok migrate` creates a portable npm/pytest template.

**Windows notes:** the npm-based `VERIFY_CMD.mjs` gate works out of the box. A POSIX `VERIFY_CMD.sh` gate requires Git Bash on PATH; if it is unavailable but `VERIFY_CMD.mjs` exists, minitok automatically falls back to it. Ctrl+C aborts a run; external termination (SIGTERM) is not delivered by Windows, so prefer Ctrl+C for stopping.

Pipeline state is stored under `.minitok/`. Tracked contracts are written to `.minitok/contracts/`; sanitized per-run evidence is written to `.minitok/evidence/runs/`. Concurrent `minitok run` invocations in the same workspace are rejected until the first run finishes.

The entitlement gate state is a local, owner-only monotonic clock marker. Deleting or restoring it can reset local clock-rollback history; this is an inherent client-side limitation. The authoritative signed entitlement, installation binding, server validation, and subscription state remain enforced after a successful online validation. The current release does not promise an offline-grace period. Do not delete `~/.minitok/entitlement/` as a troubleshooting step; use `minitok doctor` and `minitok activate` instead.

## Billing

```bash
minitok auth customer-login user@example.com
minitok checkout --plan pro
minitok activation-key
minitok portal
```

Customer login stores the JWT in `~/.minitok/entitlement/customer-token.json` with owner-only permissions. `minitok_customer_token` or an explicit `--token` can be used instead.

## Update checks

Registry update checks run by default. Disable them with `MINITOK_UPDATE_CHECK=0`, `minitok_no_update_check=1`, or `NO_UPDATE_NOTIFIER=1`; checks are also skipped in `CI`.

## Privacy

Telemetry is opt-in and remains disabled by default. User prompts, source code, file contents, LLM content, credentials, and repository metadata are not uploaded. See [POLICY.md](./POLICY.md) and [DATA_CLASSIFICATION.md](./DATA_CLASSIFICATION.md). Use is subject to the [EULA](./EULA.md).

## Run evidence

Each completed run records sanitized, machine-readable evidence in `.minitok/evidence/runs/<run-id>.json`; `latest.json` points to the most recent run. Evidence records stage summaries, changed files, verification commands and exit status, and final outcome. It does not attest to deployment, payment, entitlement, signing, provider authorization, or Git history changes.
