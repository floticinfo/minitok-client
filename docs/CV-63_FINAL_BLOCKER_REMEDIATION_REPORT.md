# CV-63 — Final Blocker Remediation Report

Date: 2026-08-29
Repository: `C:\Users\J1\minitok-client-release`
Scope: final blocker reconciliation; no version bump, publication, commit, tag, deployment, payment, webhook, production mutation, or key rotation.

## Executive summary

CV-63 remains blocked before release freeze. The client focused suite passes `71/71`. The independently reproduced broad sweep initially failed `497/503`; the confirmed product defect at `src/runtime/routes.js:11` was remediated by awaiting the async entitlement status. The post-remediation sweep is `498/503`: the HTTP status failure is cleared and five failures remain as environment fixture or stale contract tests. No tests were deleted or weakened.

The package dry run succeeds locally for version `1.3.0` with 71 files, but this is dirty-source local evidence and does not identify an immutable release artifact. The client/local-server signing fingerprints differ, production signing identity is unavailable, public parity is stale, and no immutable source pair exists.

## CV-50–CV-62 reconciliation

| Previous result | Current result | New evidence | Remaining blocker | Exact remediation |
|---|---|---|---|---|
| Dirty source/no immutable candidate | Confirmed blocked | Current status lists 13 modified tracked paths and 18 untracked paths; HEAD `c37927d8f158f8d2c963635cac9ad648b530412f`; tags stop at `v1.2.0` | No reviewed immutable source identity | Operator review/classification, later authorized commit/tag/freeze |
| Broad sweep 497/503 | 498/503 after permitted fix | `node --test` over all `tests/*.js`; async route defect fixed | Five failures remain | Reconcile fixtures/contracts deliberately and rerun |
| Focused tests 71/71 | 71/71 | `npm test` | Local-only evidence | Repeat on immutable source |
| Registry 1.3.0 mismatch | Confirmed blocked | Local pack: 71 files, 253987 unpacked bytes; historical registry: 69 files, 249555 bytes | No canonical candidate artifact | Freeze source, approve identity, then later artifact gate |
| Signing mismatch | Confirmed blocked | Client fingerprint differs from local server; production unavailable | Production identity and operator choice absent | Read-only production public-key fingerprint; no automatic selection |
| Public parity | Confirmed blocked | Public pages advertise client `1.3.0`; API health reports server `0.1.0` | Public runtime does not identify candidate | Authorized deployment after freeze, then read-only parity check |
| Offline-grace documentation | Source/public zero-grace wording, client docs require review | `src/entitlement/gate.js` constants are zero; stale historical wording remains in client documentation per CV-62 | Documentation parity | Reconcile documentation in an authorized source review |

## Broad sweep and six-failure disposition

Command: `Get-ChildItem tests -Filter '*.js' | ForEach-Object { $_.FullName } | node --test`

Initial result: `497/503`.
Post-remediation result: `498/503`.

| Test | Assertion | Expected | Actual | Classification | Exact remediation |
|---|---|---|---|---|---|
| `tests/test-core-features.js:37` `detect none` | provider count | `0` | `4` | Environment/fixture issue | Run with provider credentials isolated, or make fixture explicitly control environment; do not change product detection |
| `tests/test-core-features.js:42` `detect all 3` | configured provider count | `3` | `4` | Environment/fixture issue | Isolate ambient OpenRouter credentials or assert the intended configured set; do not weaken provider behavior |
| `tests/test-m3-runtime.js:108` entitlement structure | synchronous `r.allowed` boolean | boolean | `undefined` because `status()` is async | Stale test against async contract | Deliberately make the test await the async API or define a synchronous API contract; preserve online authorization semantics |
| `tests/test-m3-runtime.js:177` HTTP status | `r.data.entitlement.valid` boolean | boolean | `undefined` before remediation; fixed after `await` at `src/runtime/routes.js:11` | Real product bug plus stale contract | Product fix completed; rerun passed this case. Review the direct service test separately |
| `tests/test-m4-launch.js:37` missing state | `MISSING` | `MISSING` | `LEGACY_UNBOUND` from `src/entitlement/gate.js:138-140` | Contaminated fixture/intentional hardening | Use an empty disposable entitlement directory; retain legacy denial behavior |
| `tests/test-m4-launch.js:72` checkout source assertion | old Stripe/Dodo ternary text | ternary present | checkout source uses Dodo default contract | Stale test/contract mismatch | Reconcile test with approved provider policy; do not change Dodo default without policy approval |

The five remaining failures are not cleared by local passing tests. No failure demonstrated an entitlement bypass. Controlled security tests covering signatures, expiry, installation binding, copied entitlements, rollback, and server rejection remain passing.

## Current complete status disposition

Every current status path is classified; `UNKNOWN = 0`. Categories below use the requested category names. Modified release source is not automatically included in a future release: it requires review and an authorized immutable freeze.

### RELEASE PRODUCT

| Path | Why | Eventual release | Canonical/generated/audit |
|---|---|---:|---|
| `.gitignore` | Repository/package control | Yes, if reviewed | Canonical support config |
| `README.md` | Package-included documentation | Yes, after parity repair | Canonical |
| `bin/minitok.js` | CLI executable | Yes | Canonical |
| `package-lock.json` | Reproducible dependency graph | Yes | Canonical |
| `package.json` | Package identity and allowlist | Yes, without version bump in CV-63 | Canonical |
| `src/cli/commands/activate.js` | Activation CLI | Yes | Canonical |
| `src/cli/commands/activation-key.js` | Key retrieval CLI | Yes | Canonical |
| `src/cli/commands/checkout.js` | Dodo checkout CLI and legacy option | Yes after policy decision | Canonical |
| `src/entitlement/gate.js` | Local entitlement enforcement | Yes | Canonical security source |
| `src/entitlement/model.js` | Artifact validation | Yes | Canonical security source |
| `src/entitlement/online.js` | Online validation enforcement | Yes | Canonical security source |
| `src/evolution/privacy.js` | Consent/privacy control | Yes | Canonical security source |
| `src/pipeline/loop.js` | Runtime pipeline | Yes | Canonical |
| `src/runtime/entitlement.js` | Runtime entitlement service | Yes | Canonical |
| `src/runtime/routes.js` | Runtime HTTP API; async fix applied | Yes after test reconciliation | Canonical |

### SECURITY HARDENING

`src/entitlement/gate.js`, `src/entitlement/model.js`, `src/entitlement/online.js`, `src/runtime/entitlement.js`, `src/runtime/routes.js`, installation-binding code, and privacy/consent code are release security material. They enter the eventual package only after review and immutable freeze.

### TEST/QA

`tests/test-entitlement-gate.js`, `src/entitlement/online.test.js`, `tests/test-cv33-attack-matrix.js`, `tests/test-phase27-privacy-entitlement-matrix.js`, and all other existing test sources are QA-only and excluded from the package. Failing tests must not be deleted.

### AUDIT EVIDENCE

`DATA_CLASSIFICATION.md`, `PHASE27_DATA_CLASSIFICATION_PRIVACY_ENTITLEMENT_AUDIT_REPORT.md`, `POLICY.md`, `client_test_output.txt`, `cv38-final-contents.txt`, and all listed `docs/CV-31_...` through `docs/CV-62_...` files are audit evidence. They do not enter the npm package.

No client path is generated by the current Git status list. No path requires automatic deletion in CV-63. Experimental/generated package outputs not present in current status remain excluded by policy.

## Signing-key matrix

| Location | key_id | SPKI SHA-256 | Match |
|---|---|---|---|
| Client `src/entitlement/public-key.js` | `key-2024-01-prod` | `0a1dab40cb5b8782bf6543d0d2885c81e5ccc2b0a60b8b0bf957e984eb920dc3` | Client baseline |
| Local server public key | `key-2024-01-prod` | `0e286050e61a95f22f716acc6686be3db18aceb544b4f6548d8a99f29ce06b8d` | NO |
| Production | unknown | unavailable | NOT VERIFIED |

`SIGNING KEY: BLOCKED`. No private key was printed or copied, and no key was selected or rotated.

## Artifact evidence

`npm pack --dry-run --json` succeeded for `@flotic/minitok@1.3.0`: 71 files, 68,936 packed bytes, 253,987 unpacked bytes, SHA-1 `068ab3a735ac7d7f75cbdf60edd6cab6f43a1cd6`. The allowlist includes executable/source/docs and excludes tests/reports. No keys were included in the file list. This is `PASS — LOCAL ONLY`, not a release artifact, because the source is dirty and registry 1.3.0 is materially different.

A prior disposable clean-prefix install of this local package passed `minitok --version`, `--help`, `models`, and `auth status`. `doctor` returned 1 solely because the disposable environment lacked the configured `claude` adapters; this is not a product failure in that environment. No publication occurred.

## Security review

Controlled evidence passes for Ed25519 verification, key ID, installation binding, expiration, zero offline grace, copied entitlement rejection, clock rollback, runtime server rejection, and privacy/telemetry consent. The runtime route async defect was a real finding and is fixed. Additional runtime authority/state-fidelity concerns recorded in CV-62 remain review items; no speculative remediation was introduced.

## Prohibited-operation confirmation

No version bump, commit, tag, reset, revert, force push, npm publication, Docker push, deployment, production DB mutation, production migration/adoption, backfill, customer/subscription creation, payment, webhook simulation/delivery, key rotation, private-key printing/copying, or production configuration mutation occurred.

## Final decision

```text
READY FOR VERSION BUMP: NO
```

Blocking causes: broad sweep remains 498/503; source is not immutable; signing identity is unresolved; production DB/image/public parity/provider policy remain unresolved.
