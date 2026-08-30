# CV-75 Immutable Source and Signing Evidence Report — Client

## Scope and identity

Read-only evidence collection only. No Git mutation, version bump, publish, key access, payment, webhook, customer/subscription operation, deployment, or production mutation was performed.

```text
CLIENT: @flotic/minitok@1.3.0
HEAD: c37927d8f158f8d2c963635cac9ad648b530412f
BRANCH: master
WORKTREE: 0 modified tracked paths; 31 untracked paths
```

## CV-50–CV-74 reconciliation

CV-50–CV-74 established the client product identity, Dodo-only direction, signing contract, and local regression claims. CV-75 rechecked the current tree and did not promote historical or local evidence to production evidence. The client HEAD is clean with respect to tracked product files, but current untracked product/security files remain outside HEAD. Therefore HEAD alone does not include every reviewed release change.

Untracked classification from the current tree:

- PRODUCT: `src/evolution/privacy.js`
- SECURITY/RUNTIME: `src/entitlement/online.js`
- TEST: `src/entitlement/online.test.js`, `tests/test-cv33-attack-matrix.js`, `tests/test-phase27-privacy-entitlement-matrix.js`
- DOCUMENTATION/AUDIT/GENERATED: root policy/classification/output files and `docs/CV-*`
- No unknown classification was identified.

## Git metadata diagnosis

```text
GIT METADATA: DEGRADED
SOURCE CONTENT: VALID
HEAD OBJECT: VERIFIED
HEAD SHOW/LOG: READABLE
SHOW-REF: fails on malformed remote-ref/peeled packed-refs entries
FSCK: reports malformed packed refs and invalid zero remote ref; no source HEAD corruption observed
REPAIR: NOT PERFORMED
```

Observed metadata problems include malformed peeled data and a broken zero remote ref. No `.git` file was inspected for repair or modified. The HEAD commit object remains readable and verifiable, but metadata degradation prevents immutable release identity approval.

## Local verification — LOCAL ONLY

| Gate | Result |
|---|---|
| Focused client tests | 71/71 PASS |
| Broad sweep | 503/503 is prior CV-74 local evidence; not rerun by the package test command |
| `npm run lint` | PASS |
| Recursive syntax | 90/90 PASS |
| `npm pack --dry-run --json` | PASS; 71 files; package `1.3.0` |
| Package exclusion review | Tests, reports, keys, temporary outputs, and generated evidence excluded |
| Version | `@flotic/minitok@1.3.0`; no bump |

All results above are `LOCAL ONLY` and were obtained from a dirty/untracked release context where applicable.

## Signing evidence

The client trusts key ID `key-2024-01-prod` and contains a public Ed25519 key. The public key is recorded only as source identity; no private key was accessed. Production key ID, production public SPKI fingerprint, and running signer identity were not supplied.

```text
CLIENT TRUSTED KEY ID: key-2024-01-prod
CLIENT TRUSTED SPKI: PRESENT IN SOURCE
PRODUCTION KEY ID: NOT VERIFIED
PRODUCTION SPKI: NOT VERIFIED
RUNNING SERVER SIGNER: NOT VERIFIED
SIGNING IDENTITY: NOT VERIFIED
```

## Public parity

Read-only public observations on 2026-08-29:

```text
minitok.dev/                  HTTP 200; client marker 1.3.0
minitok.dev/docs              HTTP 200; client marker 1.3.0
minitok.dev/pricing           HTTP 200
minitok.dev/checkout          HTTP 200
minitok.dev/checkout/success  HTTP 200
api.minitok.dev/health       HTTP 200; server version 0.1.0
```

```text
PUBLIC AVAILABILITY: VERIFIED
PUBLIC VERSION: client 1.3.0 / server 0.1.0
PUBLIC SOURCE PARITY: NOT VERIFIED
PUBLIC IMAGE PARITY: NOT VERIFIED
```

HTTP availability is not source or image parity evidence.

## Provider and commercial boundary

```text
CLIENT ACTIVE STRIPE SURFACE: 0
DODO CANONICAL PROVIDER: YES — LOCAL SOURCE CONTRACT
DODO CHECKOUT/PORTAL/ENTITLEMENT: LOCAL SOURCE/TEST ONLY
DODO PRODUCTION COMMERCIAL LIFECYCLE: NOT VERIFIED; NOT PERFORMED
```

Historical audit/migration references are not active product surface.

## Prohibited-operation audit

```text
NONE PERFORMED
Git commit/tag/reset/revert/merge/rebase/push: NOT PERFORMED
Git metadata repair/gc/repack/prune: NOT PERFORMED
Version bump/npm publish: NOT PERFORMED
Private-key access/output/copy/rotation: NOT PERFORMED
Production DB/deployment/payment/webhook/customer/subscription mutation: NOT PERFORMED
```

## Final decision

```text
IMMUTABLE SOURCE PAIR: NOT CANDIDATE
READY FOR IMMUTABLE SOURCE FREEZE: NO
READY FOR VERSION BUMP: NO
READY FOR IMMUTABLE RC: NO
PRODUCTION READY: NO
```

## Remaining blockers and exact next actions

1. Operator must separately review and authorize a clean immutable client/server source pair containing all PRODUCT/SECURITY/MIGRATION/DEPLOYMENT changes.
2. Git metadata requires separate authorized maintenance; this report does not repair it.
3. Obtain production signer key ID, public SPKI fingerprint, and runtime signer identity without private material.
4. Bind the exact source pair to package/image, registry, deployment, and running runtime identities.
5. Recheck public parity against those immutable identities.
6. Keep version bump and production commercial lifecycle in separate authorized gates.
