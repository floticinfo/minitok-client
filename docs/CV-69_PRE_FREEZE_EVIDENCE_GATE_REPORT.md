# CV-69 Pre-Freeze Evidence Gate Report — Client

Date: 2026-08-29
Repository: `C:\Users\J1\minitok-client-release`
Scope: read-only evidence reconciliation and local verification. No version bump, Git mutation, publish, deployment, production write, key operation, or commercial operation was performed.

## Verdict

```text
READY FOR VERSION BUMP: NO
READY FOR IMMUTABLE RC: NO
PRODUCTION READY: NO
SOURCE PAIR: NOT APPROVED
```

## CV-50–CV-68 reconciliation

| Blocker | FIRST DETECTED | LAST CONFIRMED | CURRENT STATUS | NEW EVIDENCE | STILL BLOCKING? | EXACT REMEDIATION |
|---|---|---|---|---|---|---|
| Dirty/non-immutable source | CV-50 | CV-69 | DIRTY | Current status lists 17 modified tracked and 23 untracked paths | YES | Operator reviews file set; later authorized clean freeze and pair binding |
| Signing mismatch | CV-51 | CV-69 | PRODUCTION SIGNER NOT VERIFIED | Client `key-2024-01-prod`, SPKI `0a1dab40cb5b8782bf6543d0d2885c81e5ccc2b0a60b8b0bf957e984eb920dc3`; local server differs | YES | Obtain production public key ID/SPKI/runtime mapping only; no private material |
| Image/artifact provenance | CV-52/CV-54 | CV-69 | LOCAL ONLY | Dry-run artifact is `1.3.0`, 71 files, 68,982 bytes; no immutable source binding | YES | Rebuild from frozen SHA and bind artifact digest to approved deployment |
| Production DB/adoption | CV-53 | CV-69 | NOT VERIFIED | Client has no DB surface; server historical evidence remains local/disposable | YES combined | Follow approved server Strategy C evidence gate |
| Public parity | CV-54/CV-56 | CV-69 | BLOCKED | Public pages/API are reachable, but no source/artifact/runtime identity binding | YES | Verify public runtime against immutable pair |
| Broad/local test blockers | CV-60–CV-64 | CV-69 | LOCAL PASS | `npm test` 71/71, lint PASS, prior broad sweep 503/503 | NO locally; YES for promotion | Rerun against frozen source |
| Dodo lifecycle/policy | CV-55/CV-68 | CV-69 | SEPARATE AUTHORIZED COMMERCIAL GATE; policy pending | No customer, subscription, payment, webhook, or cancellation action | YES for release approval | Operator approves provider policy separately; commercial gate remains separate |

Historical LOCAL PASS results were not promoted to production evidence.

## Candidate source audit

HEAD: `c37927d8f158f8d2c963635cac9ad648b530412f`
Branch: `master`
Tags: `v1.1.0`, `v1.1.4`, `v1.2.0`
Package version: `1.3.0`

Release-relevant modified tracked files include `package.json`, `package-lock.json`, `README.md`, `bin/minitok.js`, CLI checkout/activation files, entitlement/runtime files, pipeline/MCP files, and tests. Untracked release-relevant code includes `src/entitlement/online.js`, `src/evolution/privacy.js`, associated tests, and audit/security fixtures. Untracked audit evidence includes `docs/`, policy/classification files, captured outputs, and report files.

| Classification | Current entries |
|---|---|
| RELEASE PRODUCT CODE | `bin/`, production `src/`, `package.json`, `package-lock.json`, `README.md`, `LICENSE`, `CHANGELOG.md` as applicable to the reviewed package boundary |
| SECURITY HARDENING | entitlement, online validation, privacy/sanitization, activation, runtime gate changes and their tests |
| DATABASE/MIGRATION | NONE in client |
| DEPLOYMENT | NONE in client; package metadata is release-relevant |
| WEBSITE/DOCUMENTATION | `README.md`; public website is server-owned |
| TEST/QA | tracked and untracked test files, test output |
| AUDIT EVIDENCE | `docs/CV-*`, policy/classification files, captured outputs |
| EXPERIMENTAL | NONE explicitly proven separate from dirty source |
| UNKNOWN | The exact operator-approved final inclusion set is not established; several untracked product/test/audit files coexist |

Candidate source SHA is therefore `NOT APPROVED`; unresolved files are all modified/untracked entries until operator classification. Audit files and tests are excluded from the npm package by the existing `files` allowlist, but that does not create an immutable source pair.

## Signing identity reconciliation

| Area | Key ID | SPKI SHA-256 | Source of evidence | Environment | Verification method |
|---|---|---|---|---|---|
| CLIENT TRUSTED KEY | `key-2024-01-prod` | `0a1dab40cb5b8782bf6543d0d2885c81e5ccc2b0a60b8b0bf957e984eb920dc3` | `src/entitlement/public-key.js:40-44` | Client local source | Public-key fingerprint |
| LOCAL SERVER SIGNER | `key-2024-01-prod` | `0e286050e61a95f22f716acc6686be3db18aceb544b4f6548d8a99f29ce06b8d` | Server local public material | Local server | Public-only fingerprint; local private/public equality was previously checked without exposing private material |
| PRODUCTION RUNTIME SIGNER | NOT VERIFIED | NOT VERIFIED | No admissible production evidence | Production | NOT VERIFIED |

Matching key IDs do not establish matching key material. No rotation or reconciliation was performed.

## Local verification

| Command/check | Result | Boundary |
|---|---|---|
| `npm test` | PASS, 71/71 | Dirty local source |
| `npm run lint` | PASS; recursive Node syntax check | Dirty local source; not semantic lint |
| `npm pack --dry-run --json` | PASS; 71 files, 68,982 packed bytes, 254,061 unpacked bytes; SHA-1 `fefb428847612b0fa566a941742f165cbe0575f4` | Local dry run only |
| `git diff --check` | PASS; line-ending warnings only | Dirty worktree |
| `git status --short --untracked-files=all` | Dirty | Blocking |
| Broad sweep | 503/503 PASS in CV-64–CV-67 evidence | Dirty local source |

## Cross-repository policy boundaries

Dodo is the local canonical/default checkout path (`POST /v1/checkout/dodo`, `{ planId }`, default `pro`). Stripe remains explicit legacy compatibility. CV-68 recommendation remains Stripe Option A, but this is **OPERATOR DECISION REQUIRED**, not approval. The client has no DB or image surface. Dodo customer/subscription/payment/webhook lifecycle is a **SEPARATE AUTHORIZED COMMERCIAL GATE** and was not executed.

## Operator decision sheet

```text
DECISION A — IMMUTABLE SOURCE PAIR
Client SHA: OPERATOR DECISION REQUIRED; current candidate c37927d8f158f8d2c963635cac9ad648b530412f is dirty-source baseline only
Server SHA: OPERATOR DECISION REQUIRED

DECISION B — SIGNING IDENTITY
Candidate: OPERATOR DECISION REQUIRED; CV-68 recommends production identity confirmation first
Evidence: client key-2024-01-prod / SPKI 0a1dab...; local server key-2024-01-prod / SPKI 0e286...
Production verification: NOT VERIFIED

DECISION C — DB ADOPTION
Strategy: Strategy C recommended by CV-68
Preconditions: disposable production-shaped rehearsal and production read-only catalog/duplicate/backup/lock evidence
Rollback: approved restore/recovery plan; no production operation performed here

DECISION D — 0008 UNIQUENESS
Canonical model: OPERATOR/DBA CONFIRMATION REQUIRED; source recommendation is provider-scoped `(provider, provider_event_id)`

DECISION E — STRIPE/DODO
Option A / Option B: OPERATOR DECISION REQUIRED; Option A recommended, not approved

DECISION F — RELEASE VERSION
Client: 1.3.0 observed; release version approval pending
Server: 0.1.0 observed; release version approval pending
```

## Release gate ordering

```text
CV-69 evidence gate
        ↓
Operator decisions
        ↓
Clean source freeze
        ↓
Immutable client/server source pair
        ↓
Version bump
        ↓
Git commit/tag
        ↓
Client artifact build
        ↓
Server immutable image build
        ↓
Registry provenance
        ↓
Deployment
        ↓
Public parity verification
        ↓
Authorized Dodo commercial gate
        ↓
FINAL RELEASE APPROVAL
```

PRE-RC BLOCKED — OPERATOR DECISIONS / PRODUCTION EVIDENCE REMAIN
