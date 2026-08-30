# CV-61 — Client Blocker Elimination Report

- Date: 2026-08-29
- Repository: `C:\Users\J1\minitok-client-release`
- Scope: independent pre-RC verification; no release creation

## 1. Executive summary

The hardened client source is locally coherent and the focused suite passes 71/71. The broad sweep was independently rerun and remains 497/503. The six failures are stale or environment-sensitive historical expectations, not demonstrated entitlement bypasses: two provider fixtures inherit configured environment credentials, two runtime tests expect the pre-online entitlement response shape, one gate test expects legacy artifacts to be reported as missing, and one checkout test expects the old source expression although the current Dodo-only implementation is intentional.

The client is not freeze-ready. The worktree is dirty, the hardened source is not represented by an immutable release ref, npm `1.3.0` is immutable and stale relative to the reviewed source, the public website advertises `1.3.0`, and the client trust key does not match the available local server key. Production signer identity, production image, and production database compatibility remain outside this client-only verification.

## 2. Previous blocker status

| Blocker | Classification | Current result | Next action |
|---|---|---|---|
| Broad sweep 497/503 | NOT REPRODUCED as security regression; tests remain failing | Six failures reproduced with exact assertions below | Isolate provider environment in fixtures; update obsolete contract tests only after review; rerun 503/503 |
| Dirty source/no immutable ref | CONFIRMED BLOCKER | Current status still contains release source and audit artifacts | Authorized source review, cleanup, commit, and immutable ref outside this gate |
| npm artifact mismatch | CONFIRMED BLOCKER | Registry `1.3.0` has 69 files and gitHead `c37927d`; local pack has 71 files and hardened modules | Authorized new immutable version/artifact; do not modify `1.3.0` |
| Signing identity | CONFIRMED BLOCKER / OPERATOR DECISION REQUIRED | Client and local server SPKIs differ | Authorized production public-key evidence and signer decision |
| Website parity | CONFIRMED BLOCKER | Public pages expose `1.3.0`; no `1.4.0` | Deploy only after authorized candidate freeze |
| Clean install | PARTIAL PASS | Disposable local pack installed; CLI commands ran | Repeat after immutable candidate exists |

## 3. Independent test evidence

- `npm test`: PASS, 71 passed, 0 failed.
- `npm run lint`: PASS, recursive Node syntax checks.
- Broad command `node --test tests/*.js`: 503 total, 497 passed, 6 failed.
- `git diff --check`: no content errors; line-ending warnings only.
- No version, Git, registry, production, payment, or deployment mutation occurred.

## 4. Broad sweep failure analysis

```text
FAIL-01:
Classification: TEST-ENVIRONMENT / FIXTURE PROBLEM
Root cause: tests/test-core-features.js:37 expects zero providers for {}, but detectAvailableProviders also checks environment credentials. The current process has configured provider credentials, so actual length was 4.
Security impact: None demonstrated; provider discovery is informational and does not authorize entitlement or paid access.
Release impact: Broad gate remains red until the fixture clears or injects an isolated environment.
Required code change: None established.
Required test change: Make the fixture environment-independent or pass explicit isolated provider configuration.
Status: CONFIRMED TEST FIXTURE ISSUE; RELEASE GATE STILL OPEN.

FAIL-02:
Classification: TEST-ENVIRONMENT / FIXTURE PROBLEM
Root cause: tests/test-core-features.js:42 expects exactly three providers, but current detection also returns configured OpenRouter, producing four.
Security impact: None demonstrated.
Release impact: Same broad-gate impact as FAIL-01.
Required code change: None established.
Required test change: Isolate environment variables or assert required providers rather than global count.
Status: CONFIRMED TEST FIXTURE ISSUE; RELEASE GATE STILL OPEN.

FAIL-03:
Classification: INTENTIONAL CONTRACT CHANGE / STALE TEST
Root cause: tests/test-m3-runtime.js:108 expects `allowed` in `svc.entitlement.status()`. Current online entitlement status returns the gate result through src/runtime/entitlement.js:10-12; the observed result had no valid local artifact and the assertion received undefined.
Security impact: No fail-open behavior observed; the hardened gate denies invalid/missing/legacy artifacts.
Release impact: The historical runtime response contract is not aligned with the current online entitlement contract.
Required code change: None proven; decide whether the public runtime status API must retain `allowed`.
Required test change: Update the test to the reviewed current response contract, or restore the field deliberately and add compatibility coverage.
Status: OPERATOR/CONTRACT REVIEW REQUIRED.

FAIL-04:
Classification: INTENTIONAL CONTRACT CHANGE / STALE TEST
Root cause: tests/test-m3-runtime.js:177 expects `entitlement.valid` to be boolean. The current route does construct this field at src/runtime/routes.js:15, but the online call path can return a shape without it when the test invokes the service directly; this is a test/fixture integration mismatch.
Security impact: None demonstrated; denial remains fail-closed.
Release impact: Runtime status contract is not consistently tested.
Required code change: Not established.
Required test change: Test the route contract through the route/server boundary or explicitly define service status shape.
Status: TEST CONTRACT REVIEW REQUIRED.

FAIL-05:
Classification: INTENTIONAL SECURITY CONTRACT CHANGE / STALE TEST
Root cause: tests/test-m4-launch.js:37 expects `MISSING`; the current entitlement directory contains a legacy unbound artifact, correctly reported as `LEGACY_UNBOUND` by src/entitlement/gate.js:138-139.
Security impact: Positive hardening behavior; legacy unbound artifacts are denied rather than accepted.
Release impact: Test fixture is contaminated by existing user state and expects obsolete classification.
Required code change: None.
Required test change: Use an empty disposable entitlement directory and separately assert legacy denial as `LEGACY_UNBOUND`.
Status: NOT A SECURITY REGRESSION; TEST FIXTURE REPAIR REQUIRED.

FAIL-06:
Classification: INTENTIONAL CONTRACT CHANGE / STALE SOURCE ASSERTION
Root cause: tests/test-m4-launch.js:72 expects the old ternary source expression. Current src/cli/commands/checkout.js:15 always selects `/v1/checkout/dodo`, while `--stripe` compatibility is no longer represented in this command.
Security impact: No bypass demonstrated; Dodo is the selected canonical provider path.
Release impact: Provider boundary remains a policy decision because server Stripe routes remain reachable.
Required code change: None unless legacy Stripe CLI support is explicitly required.
Required test change: Assert the reviewed Dodo default and make legacy-provider expectations match the final policy.
Status: OPERATOR DECISION REQUIRED on Stripe boundary.
```

The six failures do not justify changing tests merely to obtain green output. They identify fixture isolation and contract-policy work that must be resolved and rerun before a source freeze.

## 5. Signing-key reconciliation

Client embedded key: `key-2024-01-prod` in `src/entitlement/public-key.js:40-44`.

Independent client SPKI SHA-256:

`0a1dab40cb5b8782bf6543d0d2885c81e5ccc2b0a60b8b0bf957e984eb920dc3`

Available local server public key and private-key-derived public key:

`0e286050e61a95f22f716acc6686be3db18aceb544b4f6548d8a99f29ce06b8d`

The server public file matched the public key derived from its private key. The key ID strings match; the cryptographic key material does not.

```text
KEY ID MATCH: YES
CRYPTOGRAPHIC KEY MATERIAL MATCH: NO
PRODUCTION KEY: NOT VERIFIABLE FROM CURRENT ACCESS
```

No private key was printed, copied, replaced, or rotated. No key was selected as canonical.

## 6. Artifact and clean install

A disposable `npm pack` produced `@flotic/minitok@1.3.0`, 71 files, unpacked size 253987 bytes. It installed into `C:\Users\J1\AppData\Local\Temp\kilo\cv61-client-prefix`.

Observed from the clean prefix:

- `minitok --version`: `minitok 1.3.0`
- `minitok --help`: PASS; includes activation-key, checkout, portal, runtime, and models commands
- `minitok doctor`: ran; provider checks were environment-dependent and role adapters unavailable
- `minitok models`: ran
- `minitok auth status`: ran without exposing credential values

This is a disposable dirty-source `1.3.0` package, not a candidate release artifact. Package inclusion contained 71 files and no test files; audit reports, `tests/`, keys, and local tarballs were not in the npm file list. Candidate provenance remains unresolved.

## 7. Public parity

Read-only HEAD requests returned HTTP 200 for homepage, pricing, docs, login, checkout, checkout success, and signup. Content inspection found:

- `1.3.0`: present
- `1.4.0`: absent
- offline/grace wording: present
- Stripe: absent on fetched primary pages
- Dodo: present
- `/v1`: present
- `planId`: present
- `installation_id`: present

The public site still identifies the stale registry version and is not candidate-parity evidence.

## 8. Release-file classification

- REQUIRED PRODUCT CODE: `bin/`, `src/cli/`, `src/entitlement/`, `src/runtime/`, `src/pipeline/`
- SECURITY HARDENING: entitlement verification, online validation, installation binding, privacy controls
- DATABASE/MIGRATION: none in client
- DEPLOYMENT: none in client
- WEBSITE/DOCUMENTATION: `README.md`, `CHANGELOG.md`, reviewed public contract docs
- TEST/QA: `src/**/*.test.js`, `tests/**`
- AUDIT EVIDENCE: `docs/CV-*`, policy/classification files, test output
- EXPERIMENTAL: generated audit outputs and tarballs unless explicitly approved
- UNKNOWN: any remaining unreviewed generated file; must not enter an RC

`package.json` includes only `bin/`, `src/` excluding tests, `LICENSE`, `README.md`, and `CHANGELOG.md`. Audit evidence is excluded from the npm package by package inclusion rules.

## 9. Remaining blockers and decisions

1. Broad sweep remains 497/503 until environment isolation and stale contract fixtures are resolved.
2. No immutable client/server source pair exists.
3. Registry `1.3.0` cannot be replaced and is not the hardened candidate.
4. Production signer identity is unavailable and local server material differs from client trust.
5. Public website remains stale on release identity.
6. Candidate version/artifact authorization has not been granted.
7. Stripe compatibility policy requires an operator decision.

Dodo configuration and real Dodo payment are deferred to a separate authorized commercial lifecycle gate. They were not executed.

## 10. Prohibited-operation confirmation

No npm publish/unpublish/deprecate, Docker push, deployment, production mutation, production migration, production payment, webhook delivery/simulation, customer/subscription creation, key rotation, private-key copying/printing, Git commit/tag/reset/revert, force push, version bump, or existing `1.3.0` modification occurred.

## 11. Final decision

PRE-RC BLOCKED — PRODUCTION EVIDENCE REMAINS
