# CV-74 Pre-Freeze Verification Report — Client

## 1. Scope and decision

CV-74 is evidence collection only. No product feature, version, release, Git, production, payment, webhook, customer, subscription, or key mutation was performed.

Current identity:

```text
CLIENT: @flotic/minitok@1.3.0
HEAD: c37927d8f158f8d2c963635cac9ad648b530412f
BRANCH: master
READY FOR IMMUTABLE FREEZE: NO
```

## 2. CV-50–CV-73 reconciliation

| Prior blocker | Current status | CV-73/new fact | Resolved? | Evidence class | Exact next evidence |
|---|---|---|---|---|---|
| Dirty/non-immutable source | Client has 0 modified tracked and 31 untracked paths; audit files and local outputs are present | Current HEAD still excludes the reviewed untracked evidence/source set | No | BLOCKED | Reviewed clean source pair and immutable SHA |
| Git metadata | `.git/packed-refs` has malformed peeled line; `show-ref`/`diff --check` fail | Reproduced in current tree; no internal file changed | No | BLOCKED | Separate operator Git maintenance |
| Focused tests | 71/71 pass | Re-run in current tree | Local only | PASS — LOCAL ONLY | Repeat on approved immutable SHA |
| Broad sweep | 503/503 pass | Re-run across current `tests/*.js` | Local only | PASS — LOCAL ONLY | Repeat on approved immutable SHA |
| Package artifact | Dry-run pass, 71 files, 68,767 bytes tarball, 253,548 unpacked bytes | Current working-tree package still has version 1.3.0 | No immutable artifact | PASS — LOCAL ONLY | Freeze source, then separately authorize version/artifact gate |
| Stripe removal | Active client scoped surface has 0 matches | Dodo-only checkout/portal and no legacy flag confirmed | Yes locally | PASS — LOCAL ONLY | Preserve historical evidence classification |
| Signing identity | Client trusted key ID is `key-2024-01-prod`; production signer unavailable | No production key ID/SPKI/runtime evidence supplied | No | NOT VERIFIED | Read-only production public SPKI and runtime signer mapping |
| Public parity | Website/API reachable but not bound to this source | Public client marker 1.3.0 and API 0.1.0 observed | No | NOT VERIFIED | Immutable source/artifact/runtime binding |
| Production DB | Not a client-owned surface | No production catalog supplied | N/A combined | NOT VERIFIED | Server-owned read-only catalog |

Historical PASS claims were not promoted to production PASS.

## 3. Current verification

| Check | Result | Classification |
|---|---|---|
| `npm run lint` | PASS | PASS — LOCAL ONLY |
| `npm test` | 71/71 pass, 0 fail | PASS — LOCAL ONLY |
| Broad sweep | 503/503 pass, 0 fail | PASS — LOCAL ONLY |
| Recursive `node --check` | 90/90 pass | PASS — LOCAL ONLY |
| `npm pack --dry-run --json` | PASS; 71 files | PASS — LOCAL ONLY |
| Package contents | Tests, reports, keys, and temporary files excluded; package allowlist observed | PASS — LOCAL ONLY |
| Version identity | `@flotic/minitok@1.3.0` | Recorded; no bump performed |

## 4. Dodo-only and Stripe confirmation

Active scoped paths were `src/`, `tests/`, `bin/`, package metadata, README, CHANGELOG, and data-classification material.

```text
ACTIVE STRIPE REFERENCES: 0
STRIPE DEPENDENCY: 0
STRIPE ROUTE: 0
STRIPE ACTIVE CONFIG: 0
STRIPE ACTIVE DOCUMENTATION: 0
DODO CHECKOUT: PASS — LOCAL SOURCE/TEST ONLY
DODO PORTAL: PASS — LOCAL SOURCE/TEST ONLY
DODO WEBHOOK: NOT VERIFIED — no provider delivery performed
DODO ENTITLEMENT: PASS — LOCAL SOURCE/TEST ONLY
```

Historical migration/audit text was not treated as active product reference.

Confirmed routes are `POST /v1/checkout/dodo` with `{ planId }` and `POST /v1/portal/dodo`; the client contains no legacy provider flag. No payment, webhook delivery/simulation, customer, or subscription operation occurred.

## 5. Signing identity

```text
CLIENT TRUSTED KEY: key-2024-01-prod
CLIENT TRUSTED SPKI: recorded in source; production comparison unavailable
PRODUCTION KEY ID: NOT VERIFIED
PRODUCTION PUBLIC SPKI: NOT VERIFIED
RUNNING SERVER SIGNER: NOT VERIFIED
SIGNING IDENTITY: NOT VERIFIED
```

No private key was printed, copied, read, rotated, or handled.

## 6. Public parity

Read-only probes on 2026-08-29:

| URL | Result | Observation |
|---|---|---|
| `https://minitok.dev/` | HTTP 200 | Client marker 1.3.0 |
| `https://minitok.dev/docs` | HTTP 200 | Dodo markers; client marker 1.3.0 |
| `/pricing`, `/checkout`, `/checkout/success` | HTTP 200 | Availability only |
| `https://api.minitok.dev/health` | HTTP 200 | Server version 0.1.0 |

```text
PUBLIC AVAILABILITY: PASS
PUBLIC VERSION: client 1.3.0 / server 0.1.0
PUBLIC SOURCE PARITY: NOT VERIFIED
PUBLIC IMAGE PARITY: NOT VERIFIED
```

HTTP 200 is not parity evidence.

## 7. Source classification

All current client modified/untracked paths were enumerated. The current client has 31 untracked paths and no modified tracked paths:

- `PRODUCT`: `src/evolution/privacy.js`; production `src/` and `bin/` already tracked and unchanged.
- `SECURITY/RUNTIME`: `src/entitlement/online.js`, `src/entitlement/online.test.js` (test portion is TEST).
- `TEST`: `tests/test-cv33-attack-matrix.js`, `tests/test-phase27-privacy-entitlement-matrix.js`.
- `DOCUMENTATION`: `DATA_CLASSIFICATION.md`, `PHASE27_DATA_CLASSIFICATION_PRIVACY_ENTITLEMENT_AUDIT_REPORT.md`, `POLICY.md`, `client_test_output.txt`, `cv38-final-contents.txt`.
- `AUDIT`: every `docs/CV-31_...` through `docs/CV-73_...` path listed by `git ls-files --others --exclude-standard`.
- `GENERATED`: current captured output files are excluded from package/release identity.
- `EXCLUDED`: audit and generated files are excluded from immutable product source unless separately reviewed.

```text
UNKNOWN: 0
RELEASE FILES REVIEWED: 100%
AUDIT FILES EXCLUDED: YES
GENERATED FILES EXCLUDED: YES
EXPERIMENTAL FILES EXCLUDED: YES
IMMUTABLE SOURCE PAIR: BLOCKED — dirty/untracked evidence and degraded Git metadata
```

## 8. Prohibited-operation audit

```text
npm publish: NOT PERFORMED
Docker push: NOT PERFORMED
Production deployment: NOT PERFORMED
Production DB mutation: NOT PERFORMED
Production migration: NOT PERFORMED
Production data mutation: NOT PERFORMED
Key rotation: NOT PERFORMED
Private key output/copy: NOT PERFORMED
Real payment: NOT PERFORMED
Webhook delivery/simulation: NOT PERFORMED
Customer creation: NOT PERFORMED
Subscription creation: NOT PERFORMED
Git commit: NOT PERFORMED
Git tag: NOT PERFORMED
Git reset/revert: NOT PERFORMED
Git metadata repair: NOT PERFORMED
Version bump: NOT PERFORMED
Stripe reintroduction: NOT PERFORMED
```

## 9. Remaining blockers and exact next actions

1. Approve and create a clean immutable client/server source pair in a separately authorized gate.
2. Repair or replace malformed Git metadata only through a separately authorized operator action.
3. Obtain production signer key ID, public SPKI, runtime configuration location, and running signer identity without private material.
4. Obtain server-owned production DB read-only catalog, journal, constraints, indexes, aggregate counts, duplicate scans, and Strategy C approval.
5. Establish source SHA → build input → Dockerfile → OCI → registry → deployment → runtime digest evidence.
6. Recheck public parity against that exact immutable pair.
7. Keep Dodo commercial lifecycle as a separate commercial gate.

```text
READY FOR VERSION BUMP: NO
READY FOR IMMUTABLE RC: NO
PRODUCTION READY: NO
```
