# CV-67 Operator Decision Package — Client

Date: 2026-08-29
Repository: `C:\Users\J1\minitok-client-release`
Scope: CV-50–CV-66 reconciliation and CV-67 read-only/local-only decision preparation. No release was created.

## 1. Canonical blocker reconciliation

| Gate | CV-66 status | Can resolve locally? | Operator decision? | Production access? | Next exact action |
|---|---|---:|---:|---:|---|
| Immutable source pair | BLOCKED | YES | YES | NO | Review dirty release paths, choose reviewed file set, then create a clean pair in a later authorized gate. |
| Signing identity | DECISION REQUIRED | PARTIAL | YES | YES | Supply production signer key ID/SPKI and choose a canonical identity without exposing private material. |
| Production DB | NOT VERIFIED | NO | YES | YES | Obtain minimal read-only catalog/journal/duplicate evidence from server operator. |
| DB adoption | BLOCKED | YES for design | YES | YES | Select an approved adoption strategy after preflight, backup/restore, duplicate, lock, recovery, and post-check evidence. |
| 0008 uniqueness | PASS — LOCAL ONLY | YES | YES if policy changes | NO | Preserve `(provider, provider_event_id)` locally; production verification remains separate. |
| Client artifact | PASS — LOCAL ONLY | YES | YES for RC approval | NO | Re-run pack on the reviewed immutable source; do not treat current dirty pack as RC. |
| Server image | PASS — LOCAL ONLY | NO, server-owned | NO | YES for mapping | Obtain server source-to-image-to-runtime evidence. |
| Image provenance | NOT VERIFIED | NO | NO | YES | Obtain registry digest, deployment revision, and running digest. |
| Public parity | BLOCKED | NO | NO | YES | Compare public runtime only after immutable deployment identity is supplied. |
| Stripe/Dodo | DECISION REQUIRED | YES for policy | YES | NO initially | Select isolated legacy compatibility or removal; do not change code in CV-67. |
| Security | PASS — LOCAL ONLY | YES | NO | Later verification | Repeat client checks against the immutable pair. |
| Dodo lifecycle | SEPARATE GATE | NO | YES | YES | Authorize a separate commercial lifecycle gate; no commercial action in CV-67. |

Past PASS results are not promoted to production PASS. CV-63/CV-64 changes supersede earlier local failures, but remain dirty-source evidence.

## 2. Immutable source pair preparation

Current recorded identity:

- HEAD: `c37927d8f158f8d2c963635cac9ad648b530412f`
- Branch: `master`
- Tags: `v1.1.0`, `v1.1.4`, `v1.2.0`
- Package: `@flotic/minitok@1.3.0`
- Worktree: dirty; current inspection recorded 17 modified tracked paths and 23 untracked paths.
- Server counterpart: `c49a699eb46cc1c846d771523049240a945f097f`, branch `master`, no tags, dirty.

Current client release-relevant modified files include `package.json`, `package-lock.json`, CLI commands, entitlement/runtime code, MCP/pipeline code, and tests. Audit-only/generated/untracked content includes `docs/`, audit reports, `DATA_CLASSIFICATION.md`, `POLICY.md`, `client_test_output.txt`, `cv38-final-contents.txt`, and local reports/output. `src/entitlement/online.js`, `src/evolution/privacy.js`, and test files are untracked source/test candidates and require explicit review.

`package.json:35` allowlists `bin/`, production `src/` excluding `src/**/*.test.js`, `LICENSE`, `README.md`, and `CHANGELOG.md`. Tests, docs, reports, and local output must not enter the npm RC artifact unless the later reviewed artifact policy explicitly changes. Local tarballs and evidence files must not enter the RC.

Proposed preparation chain:

```text
CURRENT DIRTY SOURCE
  c37927d8f158f8d2c963635cac9ad648b530412f
        ↓
REVIEWED RELEASE FILE SET
        ↓
PROPOSED IMMUTABLE SOURCE SHA
        ↓
PROPOSED PAIR WITH SERVER c49a699eb46cc1c846d771523049240a945f097f
```

The proposed SHAs are references only; no commit or tag was created.

```text
IMMUTABLE PAIR CAN BE CREATED NOW: NO
```

Reason: release-relevant changes are outside the recorded HEAD, both worktrees are dirty, no operator-approved reviewed file set exists, and no pair ref is immutable. Required local/operator action is file classification and approval followed by a later authorized clean-source operation. No cleanup was performed here.

## 3. Signing key decision package

| Identity | Key ID | Public SPKI SHA-256 | Source | Evidence class |
|---|---|---|---|---|
| CLIENT TRUSTED KEY | `key-2024-01-prod` | `0a1dab40cb5b8782bf6543d0d2885c81e5ccc2b0a60b8b0bf957e984eb920dc3` | `src/entitlement/public-key.js:40-44` | VERIFIED — LOCAL ONLY |
| LOCAL SERVER KEY | `key-2024-01-prod` | `0e286050e61a95f22f716acc6686be3db18aceb544b4f6548d8a99f29ce06b8d` | server `keys/public-key.pem` and prior report evidence | VERIFIED — LOCAL ONLY |
| PRODUCTION RUNTIME KEY | unavailable | unavailable | production runtime not accessible | NOT VERIFIED |

The key IDs match but the public cryptographic materials do not. The production signer must not be guessed from either local key. Private key material was not requested, printed, copied, moved, or rotated.

| Option | Meaning | Security consequence | Migration consequence | Recommended? |
|---|---|---|---|---|
| A | Keep existing client trusted key | Preserves current client trust; server must prove it signs with the matching public key. | Minimal client trust migration; local server material may be replaced/configured later. | Conditional, only if production matches. |
| B | Select local server key as canonical | Aligns local server signer and public material, but current client would reject it until trusted-key change is authorized. | Requires client trust migration and coordinated artifact/runtime rollout. | No without explicit coordinated migration. |
| C | Confirm production key as canonical | Uses authoritative runtime identity and avoids choosing stale local material. | Requires client trust compatibility or coordinated trust migration. | Recommended evidence path. |
| D | New key rotation | Establishes a new identity and can recover from stale/mismatched material. | Requires overlap/rollout, client trust update, entitlement compatibility, and rotation procedure. | No for this gate; high migration risk. |
| E | Defer selection | Avoids unsafe choice while production evidence is absent. | Release remains blocked. | Current state only, not a release decision. |

```text
SIGNING DECISION REQUIRED: YES
RECOMMENDED OPTION: C
WHY: Production public identity must be authoritative; neither mismatched local material nor an unverified assumption can define the release signer.
```

## 4. DB and 0008 boundary

The client has no DB/migration surface. Server source reports establish local intended provider-scoped identity and migration 0008 behavior, but not production evidence.

- Fresh `0000 → 0008`: PASS — disposable/local evidence only.
- Pre-0008 fixture plus 0008: PASS — disposable/local upgrade evidence only.
- Production: `PRODUCTION DB: NOT VERIFIED`.
- 0008 local invariant: `(provider, provider_event_id)`; historical 0005 global uniqueness on `provider_event_id` alone is incompatible with cross-provider identical IDs.

No client-side production DB action is authorized.

## 5. Stripe/Dodo policy

Dodo is the default/canonical path. Explicit Stripe compatibility remains reachable in client portal/CLI boundaries, including `--stripe` behavior.

| Policy | Release risk | Migration risk | Code complexity | Backward compatibility | Security surface | Operational burden |
|---|---|---|---|---|---|---|
| A — isolated legacy Stripe | Lower immediate breakage; requires strong routing boundaries. | Low to medium. | Retains dual-provider code. | Best for existing Stripe users. | Larger surface; accidental-primary risk must be tested. | Ongoing legacy support and monitoring. |
| B — remove Stripe before release | Higher immediate compatibility risk. | Medium to high for legacy customers/data. | Lower after complete removal. | Breaks/removes legacy Stripe paths unless separately migrated. | Smaller surface after verified cleanup. | Lower long-term burden, higher cutover burden. |

```text
RECOMMENDED OPTION: A
```

Reason: Dodo can remain canonical while preserving backward compatibility, provided explicit isolation, provider identity, provider-scoped uniqueness, documentation, and cross-provider tests are accepted. No code or policy change was made here.

## 6. Public parity and local security

Read-only public observations: client `1.3.0`; API `0.1.0`; `/v1`; Dodo checkout markers; `planId`; `installation_id`; signed expiry and zero offline-grace wording; pricing `$3.99/month`, up to 3 devices; homepage, docs, login, signup, checkout, and success pages reachable. Stripe is not the public default marker.

```text
PUBLIC PARITY: NOT VERIFIED
```

Public runtime is not bound to the reviewed immutable source pair. Historical local security evidence remains:

- `npm test`: 71/71 PASS — LOCAL ONLY.
- Broad sweep: 503/503 PASS — LOCAL ONLY.
- `npm run lint`: PASS (recursive Node syntax check) — LOCAL ONLY.
- `npm pack --dry-run`: PASS for dirty local `1.3.0` — LOCAL ONLY.
- Documentation contains stale historical offline-grace wording and requires parity review.

## 7. Final operator decision sheet

| Decision | Recommended | Operator action required | Production access required |
|---|---|---:|---:|
| Immutable source pair | Approve reviewed clean pair later | YES | NO |
| Signing key | Option C, after public evidence | YES | YES |
| DB adoption | Approve only after server evidence | YES | YES |
| 0008 uniqueness policy | Keep provider-pair invariant | YES if changed | NO |
| Stripe/Dodo | Option A isolated legacy | YES | NO initially |
| Image provenance | Require full chain | NO | YES |
| Public parity | Recheck against immutable runtime | NO | YES |
| Dodo commercial lifecycle | Separate gate | YES | YES |

## 8. Final verdict

```text
READY FOR VERSION BUMP: NO
READY FOR IMMUTABLE RC: NO
PRODUCTION READY: NO
```

PROHIBITED OPERATIONS: NONE PERFORMED
