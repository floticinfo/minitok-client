# CV-71 Operator Decision and Evidence Report — Client

Date: 2026-08-29
Repository: `C:\Users\J1\minitok-client-release`
Gate: CV-71 — Operator Decision & Production Evidence Acquisition

## 1. Executive summary

Local remediation and regression evidence remain green, but the source tree is dirty and no immutable client/server pair is approved. Production signer identity, production database evidence, source-to-artifact provenance, and runtime binding are unavailable. Public HTTP markers are observable but are not cryptographically bound to the reviewed source.

Final client classification: **PRE-RC BLOCKED — PRODUCTION EVIDENCE / OPERATOR DECISIONS REMAIN**.

## 2. CV-50–CV-70 reconciliation

Available prior reports were reconciled rather than promoted blindly. CV-62–CV-70 consistently classify the hardened client as local-only and production release evidence as incomplete. CV-50, CV-51, and CV-53 were not present in this client repository; their cross-repository evidence is represented by the server and combined reports. Historical local PASS results remain historical/local evidence, not production PASS.

Current conclusions:

| Claim | Classification | Evidence |
|---|---|---|
| Client focused tests 71/71 | CURRENT / LOCAL ONLY | CV-65, CV-69, CV-70 |
| Client broad sweep 503/503 | CURRENT / LOCAL ONLY | CV-64, CV-69, CV-70 |
| Client lint | CURRENT / LOCAL ONLY | CV-69/CV-70 |
| Package dry-run | CURRENT / LOCAL ONLY | CV-70 |
| Runtime async remediation | CURRENT / LOCAL ONLY | `src/runtime/routes.js` |
| Published registry artifact parity | HISTORICAL / NOT VERIFIED | CV-38, CV-62, CV-68 |
| Production signer | NOT VERIFIED | No production public-key inspection available |
| Production database | NOT APPLICABLE TO CLIENT / NOT VERIFIED COMBINED | Server-owned evidence unavailable |
| Public client markers | CURRENT / PUBLIC HTTP ONLY | Read-only HTTP inspection |

## 3. Current source identity

| Field | Value |
|---|---|
| HEAD | `c37927d8f158f8d2c963635cac9ad648b530412f` |
| Branch | `master` |
| Tags | `release/v1.3.0-recovery`, `v1.2.0`, `v1.1.4`, `v1.1.0` |
| Package | `@flotic/minitok@1.3.0` |
| Status | `master...origin/master`; 17 modified tracked paths; 23 untracked paths |
| Immutable candidate | None approved; HEAD is a dirty-source baseline |

Modified and untracked entries include release, entitlement/security, tests, audit documents, and generated evidence. The exact porcelain status was captured with `git status --short --branch`; no cleanup, staging, commit, tag, reset, or revert was performed.

The existing `release/v1.3.0-recovery` tag does not contain the current CV-64–CV-70 remediation. Therefore it cannot be used as the reviewed immutable candidate. The current HEAD cannot be selected merely because it contains the intended code.

```text
CLIENT IMMUTABLE SOURCE: NOT VERIFIED
SERVER IMMUTABLE SOURCE: NOT VERIFIED
IMMUTABLE CLIENT/SERVER PAIR: NOT APPROVED
```

## 4. Signing reconciliation

The client trusts key ID `key-2024-01-prod` and SPKI SHA-256 `0a1dab40cb5b8782bf6543d0d2885c81e5ccc2b0a60b8b0bf957e984eb920dc3` from `src/entitlement/public-key.js:40-44`.

| Identity | Key ID | SPKI SHA-256 | Source | Status |
|---|---|---|---|---|
| Client trusted key | `key-2024-01-prod` | `0a1dab40cb5b8782bf6543d0d2885c81e5ccc2b0a60b8b0bf957e984eb920dc3` | Client public registry | CURRENT / LOCAL ONLY |
| Local server key | `key-2024-01-prod` | `0e286050e61a95f22f716acc6686be3db18aceb544b4f6548d8a99f29ce06b8d` | Historical/local reconciliation | CURRENT / LOCAL ONLY; MISMATCH |
| Production signer | Unknown | Unknown | Production configuration unavailable | NOT VERIFIED |

The key IDs match, but the available local public keys do not. Production signer configuration and production public SPKI were not accessible. No private key was printed, copied, exported, rotated, or otherwise handled.

```text
PRODUCTION SIGNER: NOT VERIFIED
```

## 5. Production database evidence

The client has no database surface. Production catalog, migration journal, indexes, duplicate scans, aggregate counts, and adoption state are server-owned and were unavailable for current inspection. Historical CV-53 evidence must not be promoted to current production PASS.

```text
PRODUCTION DB: NOT VERIFIED
DB ADOPTION STRATEGY: NOT VERIFIED
```

## 6. 0008 uniqueness semantics

The current client contract expects provider-scoped event identity and does not itself own migration 0008. Cross-repository local source review indicates provider-aware Dodo event handling and a partial unique `(provider, provider_event_id)` index. No production schema evidence exists.

```text
0008 SEMANTICS: PASS — LOCAL ONLY
```

## 7. Image provenance

The client has no production OCI image or deployment surface. `npm pack --dry-run` is local-only and was previously reported passing from the dirty `1.3.0` tree. No immutable source SHA to package digest to runtime chain is established.

```text
IMAGE BUILD: PASS — LOCAL ONLY
IMAGE PROVENANCE: NOT VERIFIED
PRODUCTION RUNTIME DIGEST: NOT VERIFIED
```

## 8. Public parity

Read-only HTTP inspection reached `https://minitok.dev/`, public docs, login, signup, checkout paths, and checkout success. Public content exposed client `1.3.0`, Dodo terminology, `/v1`, `planId`, `installation_id`, and entitlement wording. The client README still contains stale 30-day offline-grace wording at `README.md:220-225`, while source enforcement is zero-grace.

The public site is not bound to this client SHA, package digest, server image, or deployment revision.

```text
PUBLIC PARITY: NOT VERIFIED
```

## 9. Stripe/Dodo policy

Dodo is the canonical local checkout path; Stripe compatibility remains present in the combined architecture. The recommended policy is Option A: Dodo canonical with explicitly isolated legacy Stripe compatibility. This recommendation is not an operator approval and must not be treated as release authorization.

```text
RECOMMENDED: Option A
OPERATOR APPROVAL: REQUIRED
```

## 10. Security status

Current source and prior local tests cover entitlement authority, online validation, zero offline grace, installation binding, expiry/revocation/cancellation/on-hold handling, provider event identity, and fail-closed behavior. Dodo webhook verification, idempotency, and route rate-limit coverage are local-only evidence. No production security verification was performed.

```text
SECURITY: PASS — LOCAL ONLY; PRODUCTION NOT VERIFIED
```

## 11. Version identity

| Component | Current version | Intended next version |
|---|---:|---|
| Client | `1.3.0` | Not documented; do not invent |
| Server | `0.1.0` | Not documented; do not invent |

```text
READY FOR VERSION BUMP: NO
```

A version bump must wait for source freeze, signing reconciliation, DB approval, image provenance, public parity, and Stripe/Dodo policy approval.

## 12. Operator decision sheet

```text
A. IMMUTABLE SOURCE PAIR
CLIENT SHA: c37927d8f158f8d2c963635cac9ad648b530412f
SERVER SHA: c49a699eb46cc1c846d771523049240a945f097f
APPROVE: NO — dirty baselines, no approved immutable pair

B. SIGNING IDENTITY
Production key ID: NOT PROVIDED
Production SPKI: NOT PROVIDED
Client trusted SPKI: 0a1dab40cb5b8782bf6543d0d2885c81e5ccc2b0a60b8b0bf957e984eb920dc3
MATCH: NOT VERIFIED
APPROVE: NO

C. DB ADOPTION
Strategy C: NEED MORE EVIDENCE

D. 0008 UNIQUENESS
Provider-scoped uniqueness: NEED MORE EVIDENCE for production approval

E. STRIPE
SELECT: OPERATOR DECISION REQUIRED
Recommended: Option A — isolated legacy compatibility

F. COMMERCIAL LIFECYCLE
Dodo commercial lifecycle: SEPARATE AUTHORIZED GATE
```

## 13. Remaining blockers and exact next actions

1. Operator must classify the complete release file set and approve clean immutable client/server SHAs or tags.
2. Operator must provide read-only production signer key ID and public SPKI evidence, without exposing private material.
3. Operator must provide current production DB catalog, migration journal, index/constraint state, duplicate scans, and Strategy C precondition evidence.
4. Operator must provide registry digest, deployment reference, and running production digest bound to the approved source.
5. Operator must approve Option A or authorize a separate Option B removal change.
6. Operator must authorize the separate Dodo commercial lifecycle gate.

## 14. Prohibited-operation confirmation

NONE PERFORMED. No publish, deployment, DB write/migration/schema change, backup, customer/subscription/payment/refund/cancellation/webhook action, key operation, version bump, Git history mutation, or worktree cleanup occurred.

## 15. Final release decision

```text
READY FOR IMMUTABLE FREEZE: NO
READY FOR VERSION BUMP: NO
READY FOR IMMUTABLE RC: NO
PRODUCTION READY: NO

PRE-RC BLOCKED — PRODUCTION EVIDENCE / OPERATOR DECISIONS REMAIN
```
