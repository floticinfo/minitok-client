# CV-62 — Client Production Evidence Gate Report

- Date: 2026-08-29
- Repository: `C:\Users\J1\minitok-client-release`
- Scope: evidence and blocker elimination only; no release candidate, version bump, publication, deployment, payment, production mutation, or Git history mutation

## 1. Executive summary

**FINAL DECISION: PRE-RC BLOCKED — PRODUCTION EVIDENCE REMAINS**

Focused client tests pass `71/71`; the independently reproduced broad sweep is `497/503`, with six failures. Five failures are fixture or stale-contract issues, but the runtime HTTP status failure exposes a real async integration defect: `src/runtime/routes.js:11` calls the now-async entitlement service without awaiting it, so `valid`/`state` are lost. No product remediation was authorized in CV-62. Client source is dirty and has no immutable complete release ref; registry `1.3.0` is stale versus the hardened worktree; signing production identity is unavailable; public identity remains stale; and no future version bump is authorized.

## 2. Previous blocker reconciliation

| Blocker | Previous result | Current result | Evidence | Still blocking? |
|---|---|---|---|---:|
| Source freeze | BLOCKED | CONFIRMED BLOCKED | `git status`, HEAD `c37927d8f158f8d2c963635cac9ad648b530412f`, no `v1.3.0` tag; 13 modified tracked paths and 18 untracked entries including release source/audit material | YES |
| npm `1.3.0` parity | BLOCKED | CONFIRMED BLOCKED | Registry artifact recorded as 69 files/249555 bytes; current dry-run is 71 files/253987 bytes and includes hardened source | YES |
| Broad sweep | 497/503 | REPRODUCED 497/503 | Fresh `node --test tests/*.js`; exact six failures below | YES |
| Signing key | BLOCKED | CONFIRMED BLOCKED | Client SPKI differs from local server SPKI; production unavailable | YES |
| Public parity | BLOCKED | CONFIRMED BLOCKED | Public HTTP GETs: site exposes `1.3.0`, API health exposes `0.1.0` | YES |
| Offline grace | Conflicting historical docs | Source/public docs say zero; client README still has stale 30-day text | YES, documentation blocker |
| Focused tests | PASS | PASS 71/71 | `npm test` | LOCAL ONLY |

CV-50, CV-51, CV-52, CV-53, CV-54, CV-55, CV-56, CV-57, CV-58, CV-59, CV-60, and CV-61 were read. A missing standalone CV-51 file was noted in the repository search; the available cross-repository `C:\Users\J1\docs\CV-51_SIGNING_KEY_FINAL_RECONCILIATION_REPORT.md` was used. Historical claims were not promoted where current evidence contradicted or failed to refresh them.

## 3. Broad sweep: 497/503

Command: `Get-ChildItem tests -Filter '*.js' | node --test` equivalent, executed as `node --test` over all client `tests/*.js` files.

```text
CLIENT BROAD SWEEP: 497/503 PASS
```

| Failure | Expected | Actual / trace | Classification | Required disposition |
|---|---|---|---|---|
| `tests/test-core-features.js:37` `detect none` | 0 providers | 4 providers because configured environment credentials are visible to `src/llm/provider.js` | B — test fixture defect / environment issue | Isolate environment in fixture; no product change authorized |
| `tests/test-core-features.js:42` `detect all 3` | 3 providers | 4, including OpenRouter from environment | B — test fixture defect / environment issue | Isolate environment or assert required set; no product change authorized |
| `tests/test-m3-runtime.js:105-112` entitlement status | synchronous boolean `allowed` | `EntitlementService.status()` is now async and returns no synchronous `allowed` field | E/C — stale test against async contract | Review and update contract test deliberately; do not weaken authorization |
| `tests/test-m3-runtime.js:174-177` HTTP status | boolean `entitlement.valid` | `src/runtime/routes.js:11` does not await async status; response loses `valid`/`state` | A/C — real product contract defect plus stale expectation | Repair route await/response contract, then rerun; not fixed in CV-62 |
| `tests/test-m4-launch.js:37` missing state | `MISSING` | Existing user artifact is correctly classified `LEGACY_UNBOUND` by `src/entitlement/gate.js:138-140` | B — contaminated fixture / intentional hardening | Use an empty disposable entitlement directory; preserve legacy denial |
| `tests/test-m4-launch.js:72` checkout source assertion | Old Stripe ternary expression | `src/cli/commands/checkout.js:15` unconditionally selects `/v1/checkout/dodo` | D/E — intentional Dodo contract change and stale source assertion | Align test only after Stripe policy review; no product change authorized |

No broad failure demonstrated an entitlement bypass. Security tests covering tampering, signature, expiry, installation binding, copied state, rollback, and server rejection remain passing. The broad sweep cannot be promoted to 503/503 until the real async defect is repaired and the fixture/stale-contract tests are deliberately reconciled.

Additional contract audit findings: `src/pipeline/loop.js:121-137` performs one online check before the async cycle loop and does not revalidate mid-run; `src/evolution/upload.js:38` can reuse the pre-run `_entitlementCheck` snapshot or fall back to local-only checking; `src/entitlement/gate.js:145-147` persists validation timestamps before the asynchronous server result; `src/entitlement/online.js:71-73` treats every validation exception as offline allowance until expiry; `src/cli/commands/status.js:19` uses local-only status. These are runtime authority/state-fidelity gaps requiring remediation review, not reasons to weaken tests.

## 4. Contract reconciliation

| Contract | Result | Evidence |
|---|---|---|
| Checkout | PASS in source | `src/cli/commands/checkout.js:15-21`; `/v1/checkout/dodo`, `{ planId }` |
| Provider resolution | PASS in server source | Server `src/api/checkout-dodo.js:13-31`; customer identity from JWT and `planId` passed to server mapping; product IDs are not client-controlled |
| Activation-key retrieval | PASS in source/tests | Server `src/api/activation-key.js:11-39`; customer JWT required; service performs ownership and one-time retrieval; client sends Bearer token |
| Activation | PASS in source/tests | Client activation sends `{ key, installation_id }`; server binds customer/key/subscription/installation and rejects reuse/concurrency violations in controlled tests |
| Validation authentication | PASS in source/tests | Server validation requires installation token; customer token is rejected by controlled security tests |
| Validation ownership/state | PASS controlled | Installation ownership, subscription state, entitlement signature, key ID, expiry, and binding are checked by validation service/tests |
| Runtime authority | PARTIAL / BLOCKED | Client online path uses server validation and server rejection denies; local artifact is not authoritative for server cancellation. Runtime HTTP route has the async defect above |
| Offline grace | SOURCE PASS, DOC DRIFT | `src/entitlement/gate.js:18-19` sets both grace constants to zero; valid signed entitlement is usable only until `expires_at`; client `README.md:223` retains stale 30-day wording |
| Subscription overrides | PASS controlled | Server paid access only for active future-period subscriptions; cancellation, expiry, failed payment, `on_hold`, and revoked installation deny access |

## 5. Signing-key matrix

| Material | Key ID | SPKI SHA-256 | Result |
|---|---|---|---|
| Client `src/entitlement/public-key.js:40-44` | `key-2024-01-prod` | `0a1dab40cb5b8782bf6543d0d2885c81e5ccc2b0a60b8b0bf957e984eb920dc3` | VERIFIED locally |
| Local server public key | `key-2024-01-prod` | `0e286050e61a95f22f716acc6686be3db18aceb544b4f6548d8a99f29ce06b8d` | VERIFIED locally |
| Local server private-derived public | `key-2024-01-prod` | `0e286050e61a95f22f716acc6686be3db18aceb544b4f6548d8a99f29ce06b8d` | Matches local public file |
| Production public key | unknown | unavailable | NOT VERIFIED |

```text
CLIENT KEY = local server key: NO
PRODUCTION KEY: unavailable
SIGNING KEY RECONCILIATION: BLOCKED
```

No private key was output or copied. No key was selected, rotated, or changed.

## 6. Artifact and clean-install status

Current `npm pack --dry-run --json` succeeds locally for `@flotic/minitok@1.3.0`, with 71 files, 68,936 packed bytes, 253,987 unpacked bytes, and SHA-1 `068ab3a735ac7d7f75cbdf60edd6cab6f43a1cd6`. The package allowlist is `bin/`, `src/` excluding tests, `LICENSE`, `README.md`, and `CHANGELOG.md`; audit reports and `tests/` are excluded. This is a dirty-source local artifact, not an immutable candidate.

A disposable clean-prefix install succeeded with exit 0 and installed four packages. Packaged CLI verification: `--version` returned `minitok 1.3.0` (0), `--help` passed (0), `models` passed (0), and `auth status` returned `No stored credentials.` (0). `doctor` ran without crashing but returned 1 because the disposable environment lacked the default `claude` adapters. `npm run lint` passed; no typecheck script exists. No publish occurred and the repository status was unchanged.

Required future artifact source state: a reviewed clean immutable client commit containing all intended hardening, corrected runtime route behavior, reconciled documentation, reviewed test fixtures, and an approved version identity. No version was bumped in CV-62.

## 7. Public parity

Read-only public HTTP results:

- `https://minitok.dev/`, `/pricing`, `/docs`, `/login`, `/signup`, `/checkout`, `/checkout/success`: HTTP 200.
- `/docs` exposes `1.3.0`, `0.1.0`, `/v1`, Dodo, `planId`, `installation_id`, and zero-offline-grace wording.
- `https://api.minitok.dev/health`: HTTP 200, `{"status":"ok","version":"0.1.0"}`.
- Public docs advertise the hardened contract but do not identify an immutable candidate; public checkout page resolves to homepage and no authenticated checkout was initiated.

```text
PUBLIC PARITY: BLOCKED
```

No website or API deployment was performed.

## 8. Release-file classification

- **REQUIRED PRODUCT CODE:** `bin/minitok.js`; `src/cli/commands/*`; `src/pipeline/*`; `src/runtime/*`; core `src/auth`, `src/config`, `src/context`, `src/git`, `src/llm`, `src/mcp`, `src/workspace`, `src/utils`.
- **SECURITY HARDENING:** `src/entitlement/gate.js`, `model.js`, `online.js`, `verify.js`, `public-key.js`; installation-bound activation; privacy/consent controls; related source.
- **DATABASE/MIGRATION:** none in client.
- **DEPLOYMENT:** none in client.
- **WEBSITE/DOCUMENTATION:** `README.md`, `CHANGELOG.md`, reviewed install/API documentation.
- **TEST/QA:** `src/**/*.test.js`, `tests/**`.
- **AUDIT EVIDENCE:** `docs/CV-*`, `DATA_CLASSIFICATION.md`, `POLICY.md`, `PHASE27_*_AUDIT_REPORT.md`, `client_test_output.txt`, `cv38-final-contents.txt`.
- **EXPERIMENTAL:** generated tarballs and temporary outputs; excluded from the package by the allowlist.
- **UNKNOWN:** at least 17 untracked status entries are reported, but available evidence does not enumerate every path. Any unlisted current modified/untracked path, `.gitignore`, `src/core/version.js` or `src/entitlement/package.json` if present in status, and any unreviewed generated package/test/workspace file remain UNKNOWN. No UNKNOWN file may enter an RC.

## 9. Client blocker matrix

| Gate | Result | Blocking | Evidence | Next action |
|---|---|---:|---|---|
| Client broad sweep | `497/503` | YES | Fresh reproduction; six failures above | Repair async defect, isolate fixtures, reconcile stale tests, rerun |
| Client focused tests | `71/71` PASS | NO, local only | `npm test` | Repeat on immutable source |
| Client lint | PASS | NO, local only | `npm run lint` | Keep as syntax validation or approve stronger tool |
| Client source freeze | FAIL | YES | Dirty worktree/no tag | Review, classify, commit/tag only in later authorized gate |
| Client artifact | FAIL for release | YES | Local 1.3.0 differs from registry 1.3.0 | Future approved version/artifact gate |
| Signing key | BLOCKED | YES | Client/local mismatch; production unavailable | Read-only production fingerprint and operator decision |
| Public parity | BLOCKED | YES | Stale public identity/runtime | Authorized deployment then recheck |
| Runtime status contract | BLOCKED | YES | Missing await in `src/runtime/routes.js:11` | Product remediation and focused/broad rerun |
| Version bump | NO | YES | Multiple unresolved critical gates | Do not change `package.json` |

## 10. Prohibited-operation confirmation

No npm publish/unpublish/deprecate, Docker push, deployment, production DB mutation, production configuration mutation, customer/subscription creation, real payment, webhook simulation/delivery, key rotation, private-key output/copy, commit, tag, reset, revert, force-push, or package version bump occurred.

## 11. Final decision

```text
READY FOR VERSION BUMP: NO
PRE-RC BLOCKED — PRODUCTION EVIDENCE REMAINS
```
