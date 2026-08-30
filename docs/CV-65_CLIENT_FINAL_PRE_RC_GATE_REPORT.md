# CV-65 Client Final Pre-RC Gate Report

Date: 2026-08-29
Repository: `C:\Users\J1\minitok-client-release`
Scope: read-only verification and report generation. No version bump, commit, tag, publish, deployment, payment, webhook, production mutation, or key operation.

## 1. Executive summary

Local client verification is green: `npm test` 71/71, `npm run lint` PASS, complete broad sweep 503/503, package dry-run PASS, and client `git diff --check` PASS. These are local-only results. The client worktree is dirty, the published npm artifact is still 1.3.0, the production signer is not verified, and production/public provenance is unavailable. Release gates remain blocked.

```text
READY FOR VERSION BUMP: NO
READY FOR IMMUTABLE RC: NO
PRODUCTION READY: NO
```

## 2. CV-50–CV-64 reconciliation

- CV-50–CV-59 established dirty source, stale published artifact, signing mismatch, missing production DB/image/public evidence, and unresolved Stripe/Dodo and Dodo lifecycle gates.
- CV-60 reproduced 497/503 broad-sweep failures and confirmed production evidence gaps.
- CV-61 isolated fixture/stale-contract failures.
- CV-62 identified the real async runtime authority defect at `src/runtime/routes.js`, while preserving the production evidence blockers.
- CV-63 fixed the async route; result became 498/503.
- CV-64 reconciled fixtures/contracts and online fail-closed behavior; result became 503/503 and focused tests 71/71. It did not establish an immutable source pair or production evidence.

The original async runtime defect is remediated and exercised by `tests/test-m3-runtime.js` and the broad sweep. Prior 497/503 and 498/503 findings are superseded for the current dirty worktree; production findings remain current.

## 3. Current source identity and classification

HEAD: `c37927d8f158f8d2c963635cac9ad648b530412f`; tags: `v1.1.0`, `v1.1.4`, `v1.2.0`; package version: `1.3.0`.

Current status is dirty: 17 modified tracked paths and 23 untracked paths (40 status entries at inspection). All paths were classified: release product code; security hardening; test/QA; audit evidence; generated/local output; or documentation/policy. `UNKNOWN=0` after classification. No files were deleted or quarantined. Release-relevant modified files include package metadata, CLI, entitlement/runtime authority, pipeline, MCP, and tests. Audit reports and local output are not release source.

`package.json:35` allowlists `bin/`, `src/` excluding `src/**/*.test.js`, and root release docs/license. `docs/`, `tests/`, audit reports, and `client_test_output.txt` are excluded from the npm artifact. `.gitignore` excludes local dependencies, environment files, logs, reports, and local entitlement state. Client has no Docker image or deployment surface.

## 4. Client verification

- `npm test`: **71/71 PASS**.
- `npm run lint`: **PASS**; configured check is recursive Node syntax validation, not semantic lint.
- Broad sweep: **503/503 PASS** using `node --test` over all `tests/*.js`.
- Focused runtime authority: async status and HTTP route behavior pass; configured online validation denies on network failure with `SERVER_UNREACHABLE`; no zero-grace bypass was introduced.
- `/v1` behavior, Dodo checkout `{ planId }`, activation `{ key, installation_id }`, installation binding, expiry, online entitlement enforcement, zero offline grace, revocation/cancellation/refund/chargeback denial are covered by current focused/broad tests. No test-only bypass was found in the release source reviewed.
- `npm pack --dry-run --json`: **PASS**, local `@flotic/minitok@1.3.0`, 71 files, 68982 bytes tarball, 254061 unpacked bytes. This is not an immutable or registry-approved candidate artifact.
- Registry read-only query: published version remains `1.3.0`.

## 5. Signing-key evidence

Client trusted key ID: `key-2024-01-prod`.
Client trusted SPKI SHA-256: `0a1dab40cb5b8782bf6543d0d2885c81e5ccc2b0a60b8b0bf957e984eb920dc3` from `src/entitlement/public-key.js:40-44`.
Local server SPKI: `0e286050e61a95f22f716acc6686be3db18aceb544b4f6548d8a99f29ce06b8d`; local private-derived public key matches its local public file. Client and local server cryptographic keys differ. Production key ID, production public fingerprint, runtime signer fingerprint, and production signer identity are unavailable.

```text
PRODUCTION SIGNER: NOT VERIFIED
```
Required read-only evidence is production public-key fingerprint, production key ID, server signer fingerprint, runtime signer fingerprint, and comparison to client trust material. No private key was printed, copied, or rotated.

## 6. Database, image, parity, and policy boundaries

The client has no database/migration surface. Server DB adoption and provider uniqueness are server gates. Local server image build is not client artifact provenance. Public read-only site inspection showed client `1.3.0`, Dodo terminology, `/v1`, `planId`, `installation_id`, and zero-grace wording, but candidate-to-public runtime identity is not proven. Public parity is **BLOCKED** for release purposes.

Stripe remains reachable through explicit compatibility paths in the client while Dodo is default. No authoritative policy chooses isolated legacy compatibility versus Stripe removal:

```text
STRIPE/DODO POLICY: OPERATOR DECISION REQUIRED
```

Real Dodo payment, customer, subscription, refund/cancellation, chargeback, and webhook lifecycle is not performed in CV-65:

```text
DODO COMMERCIAL GATE: SEPARATE AUTHORIZED COMMERCIAL GATE
```

## 7. Final blocker matrix

| Gate | Current Result | Evidence | Blocking? | Required Evidence/Action | Owner |
|---|---|---|---|---|---|
| Client broad sweep | PASS — LOCAL ONLY | 503/503 | No local defect; release still gated | Repeat on immutable pair | Implementer/operator |
| Client focused tests | PASS — LOCAL ONLY | 71/71 | No local defect | Repeat on frozen source | Implementer |
| Source classification | PASS — LOCAL ONLY | status inventory, UNKNOWN=0 | Yes, dirty source | Review and authorize freeze | Operator |
| Immutable source pair | BLOCKED | dirty client/server trees | Yes | Approved clean pair and documented relationship | Operator |
| Signing key | NOT VERIFIED | client/local mismatch; production unavailable | Yes | Authorized production public fingerprint | Operator |
| Client artifact | PASS — LOCAL ONLY | npm dry-run; registry still 1.3.0 | Yes for new RC | Frozen source artifact and authorized version gate | Operator |
| Public parity | BLOCKED | public identity observed, runtime provenance absent | Yes | Candidate deployment/runtime identity | Operator |
| Security controls | PASS — LOCAL ONLY | focused/broad security coverage | Yes only until frozen-source repeat | Repeat on immutable source | Implementer |
| Stripe/Dodo policy | OPERATOR DECISION REQUIRED | Dodo default, Stripe compatibility remains | Yes | Select Option A or B | Operator |
| Dodo commercial gate | SEPARATE COMMERCIAL GATE | no real lifecycle run | Yes for commercial approval | Authorized sandbox/commercial evidence | Commercial operator |

## 8. Exact next actions

1. Operator selects Stripe policy and authorizes source review/freeze.
2. Obtain read-only production signer fingerprints without exposing private material.
3. Resolve server DB adoption and production uniqueness through an authorized maintenance gate.
4. Establish reviewed source SHA → build → OCI digest → deployment → runtime evidence.
5. Re-run client gates on the resulting immutable pair; only then consider a separately authorized version/artifact operation.
6. Run the commercial Dodo lifecycle only under its separate authorization.

## 9. Prohibited-operation confirmation

NONE PERFORMED. No version bump, tag, commit, Git push, npm publish, Docker push, deploy, production DB operation, key rotation, private-key exposure, customer/subscription creation, real payment, or webhook delivery occurred.

## 10. Final decision

```text
READY FOR VERSION BUMP: NO
READY FOR IMMUTABLE RC: NO
PRODUCTION READY: NO
```
