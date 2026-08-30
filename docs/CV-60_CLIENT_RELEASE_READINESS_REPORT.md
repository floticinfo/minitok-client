# CV-60 — Client Release Readiness Report

- Date: 2026-08-29
- Repository: `C:\Users\J1\minitok-client-release`
- Scope: CV-60 release-readiness audit against `C:\Users\J1\minitok-server-deploy`
- Prior reports inspected: client CV-54, CV-58, CV-59; server CV-49 through CV-59, including CV-50, CV-52, CV-53, CV-55, CV-56, CV-57, and CV-59
- Safety: no commit, tag, reset, revert, publish, deploy, push, version change, production DB mutation, migration, key rotation, private-key output/copy, real payment, webhook, customer, or subscription operation performed

## 1. Executive decision

The client is not ready for a version bump. The worktree is dirty, hardened source is outside the immutable `c37927d8f158f8d2c963635cac9ad648b530412f` HEAD, npm registry `1.3.0` is materially different from the hardened worktree, the client/local-server public signing fingerprints differ, public website identity remains stale, and the broad client regression sweep has six failures. The existing focused package test suite remains green, but unknown or conflicting release evidence is not promoted to pass.

## 2. Canonical identity and source state

| Gate | Result | Evidence |
|---|---|---|
| Package identity | PASS | `package.json:2-3`; `@flotic/minitok`, version `1.3.0` |
| Immutable release identity | FAIL | `git log -1 --oneline --decorate`; HEAD `c37927d`; no `v1.3.0` tag; hardened changes remain outside HEAD |
| Clean source tree | FAIL | `git status --short --branch`; 12 modified tracked files and 17 untracked status entries, including release source/tests/docs |
| Git diff validation | PASS | `git diff --check`; no content error, only line-ending warnings |
| Version bump readiness | FAIL | No authorized candidate version or immutable source/artifact pair; no version changed |

## 3. Client/server contract

| Contract | Result | Evidence |
|---|---|---|
| API namespace `/v1` | PASS | `src/cli/commands/activate.js:43-46`, `src/cli/commands/checkout.js:14-22`, `src/entitlement/online.js:63-66` |
| Dodo checkout `{ planId }` | PASS | `src/cli/commands/checkout.js:14-22`; controlled server Dodo tests |
| Activation `{ key, installation_id }` | PASS | `src/cli/commands/activate.js:43-46`; client/server contract tests |
| Online validation | PASS | `src/entitlement/online.js:57-73` posts `/v1/validate` and handles server validation |
| Installation binding | PASS | `src/entitlement/verify.js:111-128`; `tests/test-client-server-contract.js`; focused tests |
| Zero offline grace policy | PASS | `tests/test-security.js`, `tests/test-entitlement-gate.js`, `tests/test-cv33-attack-matrix.js`; valid signed entitlement only until `expires_at` |
| Client/server signing material | FAIL | Client SPKI `0a1dab40cb5b8782bf6543d0d2885c81e5ccc2b0a60b8b0bf957e984eb920dc3`; available local server SPKI `0e286050e61a95f22f716acc6686be3db18aceb544b4f6548d8a99f29ce06b8d`; key ID matches only |
| Production signer identity | NOT VERIFIED | No authoritative production public-key fingerprint available; private material was not printed or copied |

## 4. Artifact and clean-install readiness

| Gate | Result | Evidence |
|---|---|---|
| Registry `1.3.0` exists | PASS | `npm view @flotic/minitok@1.3.0 version gitHead dist --json`; version and gitHead `c37927d` |
| Registry parity with hardened source | FAIL | Registry: 69 files/249555 bytes; current `npm pack --dry-run --json`: 71 files/253987 bytes; prior CV-54 comparison records material hardened-source differences |
| Local pack dry run | PASS | `npm pack --dry-run --json`; generated inspectable 1.3.0 package, not an immutable approved candidate |
| Clean install of candidate | NOT VERIFIED | No immutable candidate artifact exists; prior clean install covered stale local/registry 1.3.0 only |
| Clean-install CLI basics | PASS | Prior CV-59 local 1.3.0 evidence: `minitok --version`, `--help`, `doctor`, `models`, `auth status`; not candidate evidence |
| `migrate` clean-install flow | NOT VERIFIED | Prior CV-54/CV-59 evidence did not run initialized-workspace migration |
| Artifact secret/provenance exclusion | NOT VERIFIED | No frozen candidate artifact exists for final deterministic inspection |

## 5. Documentation and public website parity

| Gate | Result | Evidence |
|---|---|---|
| Local client contract docs | NOT VERIFIED | `README.md`, `CHANGELOG.md`, and historical material require final version/source reconciliation; dirty tree prevents canonical claim |
| Public homepage availability | PASS | Read-only `Invoke-WebRequest https://minitok.dev/`; HTTP 200 |
| Public docs availability | PASS | Read-only `Invoke-WebRequest https://minitok.dev/docs`; HTTP 200 |
| Public install/version parity | FAIL | Public homepage/docs contain `1.3.0`; no candidate immutable version is exposed |
| Public API/version parity | FAIL | `https://api.minitok.dev/health` HTTP 200 reports server `0.1.0`; candidate pair is not established |
| Public contract markers | PASS | Public docs contain `/v1`, Dodo, `planId`, and `installation_id` |
| Public offline-grace parity | FAIL | Public docs contain `offline`/`grace` markers; exact deployed wording and candidate parity are not approved as canonical |

## 6. Dodo/Stripe boundary and on_hold

| Gate | Result | Evidence |
|---|---|---|
| Dodo checkout default | PASS | `src/cli/commands/checkout.js:14-22`; default endpoint `/v1/checkout/dodo` |
| Dodo portal default | PASS | `src/cli/commands/portal.js:14-18` |
| Stripe compatibility boundary | NOT VERIFIED | `src/cli/commands/portal.js:14-18` retains explicit `--stripe`; final release policy for legacy Stripe routes remains unresolved in CV-57/CV-59 |
| Real Dodo payment | BLOCKED | CV-55/CV-59 precondition gate stopped before checkout; no payment/customer/subscription operation allowed |
| Real Dodo webhook | BLOCKED | No provider delivery or signed webhook was received |
| `on_hold` paid-access behavior | PASS | Server source/tests map `on_hold` to deny-access state; this is controlled/source evidence, not live lifecycle evidence |

## 7. Database and image readiness

| Gate | Result | Evidence |
|---|---|---|
| Canonical migration chain known | PASS | Server `src/db/migrations`: `0000` through `0008`; `_journal.json` contains `0008_subscription_entitlement_hardening` |
| Production DB compatibility | FAIL | Prior read-only CV-53 evidence: absent `drizzle.__drizzle_migrations`, missing `subscriptions.last_provider_event_at`, `last_provider_event_id`, and canonical `0008` indexes |
| Current DB freshness | NOT VERIFIED | No new production catalog connection performed in CV-60 |
| Disposable DB readiness | PASS | Prior CV-53/CV-52 disposable replay evidence applies `0000`–`0008`; no production mutation performed |
| Canonical server image | NOT VERIFIED | CV-52/CV-59 identify only local dirty diagnostic images; no production digest/source chain |
| Image provenance | NOT VERIFIED | No registry immutable digest or production image inspection available |

## 8. Automated validation and security regression

| Gate | Result | Evidence |
|---|---|---|
| Configured client `npm test` | PASS | `npm test`; 71 passed, 0 failed |
| Substantive client lint | PASS | `npm run lint`; recursive `node --check` over `bin` and `src`, not a semantic linter |
| Client broad regression/security sweep | FAIL | `$files=Get-ChildItem tests -Filter '*.js'; node --test $files`; 503 total, 497 passed, 6 failed: provider detection environment assumptions, runtime entitlement shape, missing-state expectation, and checkout source assertion |
| Client typecheck | NOT AVAILABLE | No typecheck script in `package.json` |
| Tamper/local-state/copy/expiry security tests | PASS | Broad sweep passing security suites include entitlement tamper, signature, state fabrication, cross-machine copy, expiry, rollback, and protected-file controls |
| Private-key exposure regression | PASS | `tests/test-security.js`; confirms no private key in client public-key source; no private material printed by audit |
| Server security regression | PASS | Server `npm test`; 731 passed, 0 failed; controlled JWT, IDOR, tamper, webhook, Dodo, `on_hold`, and entitlement tests |
| Server lint | NOT AVAILABLE | `npm run lint` missing in server `package.json` |
| Server typecheck | NOT AVAILABLE | `npm run typecheck` missing in server `package.json` |
| Security regression evidence as customer E2E | NOT VERIFIED | Controlled tests do not prove production key/image/DB or paid lifecycle behavior |

## 9. Prohibited-operation record

No publish, deploy, push, Git mutation, version change, production DB write/migration/schema change, key rotation, private-key output/copy, real payment, webhook simulation, customer creation, subscription creation, or production runtime mutation occurred. Public HTTP GETs, npm metadata reads, local tests, syntax checks, and local pack dry run were the only external/read-only validation actions.

## 10. Blockers

1. Dirty client and server release source; no immutable complete pair or release tag.
2. Registry 1.3.0 is stale relative to hardened local source and cannot be replaced.
3. Client and available local server signing fingerprints differ; production signer is unknown.
4. Production DB compatibility is blocked by prior read-only incompatibility evidence and current freshness is not reverified.
5. Canonical production image/source provenance is not verified.
6. Public website/API remain on 1.3.0/0.1.0 identity rather than an approved immutable candidate.
7. Client broad regression sweep has six failures; focused package tests pass but cannot override failures.
8. Server lint/typecheck are unavailable.
9. Real Dodo payment/webhook/customer/subscription lifecycle is blocked and not verified.

## 11. Current release-file classification

- REQUIRED PRODUCT CODE: `bin/minitok.js`, `src/cli/commands/{checkout,activation-key,activate}.js`, `src/entitlement/*`, `src/runtime/entitlement.js`, `src/pipeline/loop.js`
- SECURITY HARDENING: `src/entitlement/{gate,model,verify,online}.js`, `tests/test-security.js`, `tests/test-cv33-attack-matrix.js`
- DATABASE/MIGRATION: NONE in client
- DEPLOYMENT: NONE in client
- WEBSITE/DOCUMENTATION: `README.md`, `CHANGELOG.md`, `docs/**`
- TEST/QA: `src/**/*.test.js`, `tests/**`
- AUDIT EVIDENCE: `CV-*.txt`, `*_REPORT.md`, `DATA_CLASSIFICATION.md`, `POLICY.md`
- EXPERIMENTAL: none identified separately
- UNKNOWN: `client_test_output.txt` and any unreviewed generated evidence not listed above; these are not release-authorized files

Current identity: client HEAD `c37927d8f158f8d2c963635cac9ad648b530412f`; server HEAD `c49a699eb46cc1c846d771523049240a945f097f`. Current client status contains 12 modified tracked files and 17 untracked entries; release-relevant dirty files are present, and the untracked-file count is 17. CV-57's hardened-source classification is materially unchanged; CV-60 adds the six-test broad sweep failure and confirms public/image/DB/key evidence remains unresolved.

## 12. Required operator decisions

1. Establish the approved immutable client/server source pair and release tag without changing versions in this audit.
2. Resolve the client/local-server/production signing-key identity through an authorized operator decision; do not rotate based on this report.
3. Provide a verified non-destructive production DB adoption/upgrade plan and immutable server image digest/source mapping.
4. Reconcile active documentation/public pages and rerun the full client regression suite after resolving the six failures.
5. Complete Dodo merchant, product, sandbox, credential, and webhook configuration in a separate authorized lifecycle exercise.

## 13. Release readiness matrix

| Gate | Result | Evidence |
|---|---|---|
| Client source | FAIL | Dirty release-relevant worktree; no immutable complete candidate |
| Server source | FAIL | Server worktree is dirty and not paired immutably |
| Client version identity | FAIL | `package.json` is `1.3.0`, but no `v1.3.0` tag for hardened source |
| Server version identity | FAIL | `package.json` remains `0.1.0`; no approved pair |
| Client tests | PASS | `npm test`: 71/71 |
| Server tests | PASS | `npm test`: 731/731 |
| Client lint | PASS | Syntax-only `node --check` script; non-semantic |
| Server lint | NOT AVAILABLE | No script |
| Server typecheck | NOT AVAILABLE | No script |
| Client artifact | FAIL | Registry `1.3.0` differs from hardened source |
| Server image | NOT VERIFIED | No immutable production digest |
| Image provenance | NOT VERIFIED | No source-to-image chain |
| Signing key | FAIL | Client and available local server fingerprints differ; production unknown |
| Production DB | FAIL | Prior read-only evidence lacks canonical `0008` objects |
| DB upgrade path | NOT VERIFIED | No safe production adoption path established |
| API contract | PASS | `/v1/checkout/dodo`, `{ planId }`, activation, validation inspected |
| Entitlement contract | PASS | Ed25519, key ID, expiry, binding, strict validation, zero grace inspected |
| Subscription state | PASS | Controlled `on_hold` deny-access mapping; live lifecycle absent |
| Dodo boundary | NOT VERIFIED | Dodo canonical path exists; Stripe compatibility policy unresolved |
| Website parity | FAIL | Public identity and offline-grace wording are not candidate-parity verified |
| Clean install | NOT VERIFIED | No immutable candidate artifact |
| Security regression | FAIL | Broad client sweep 497/503; controlled server suite green |
| Real Dodo payment | BLOCKED | Prohibited and not configured/verified |

## 14. Final decision

The client cannot be approved for a version bump or release candidate. Existing passing focused tests establish useful local behavior only; they do not clear identity, artifact, signing, production, parity, or lifecycle blockers.

RELEASE CANDIDATE BLOCKED
