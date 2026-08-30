# CV-66 Operator Evidence Gate Report — Client

Date: 2026-08-29
Repository: `C:\Users\J1\minitok-client-release`
Scope: read-only CV-66 closure gate. No release creation, version change, commit, tag, publish, deployment, production mutation, commercial operation, or key mutation was performed.

## 1. Scope and CV-65 baseline

CV-65 recorded client tests 71/71 PASS, broad sweep 503/503 PASS, lint PASS, and package dry-run PASS as local-only evidence. It also recorded dirty source, signing mismatch, absent current production evidence, unbound public parity, unresolved Stripe/Dodo policy, and an unauthorized commercial lifecycle.

Current CV-66 decision remains:

```text
READY FOR VERSION BUMP: NO
READY FOR IMMUTABLE RC: NO
PRODUCTION READY: NO
```

## 2. Current source identity

- HEAD: `c37927d8f158f8d2c963635cac9ad648b530412f`
- Tags: `v1.1.0`, `v1.1.4`, `v1.2.0`
- Source package version: `@flotic/minitok@1.3.0`
- Worktree: dirty; 17 modified tracked paths and 23 untracked paths at inspection
- Release-relevant dirty paths include `package.json`, `package-lock.json`, CLI commands, entitlement/runtime code, MCP/pipeline code, and tests
- Audit reports, generated output, and local evidence are also untracked
- Client worktree clean: NO

The current HEAD is not an immutable reviewed release pair because the reviewed hardening is partly outside HEAD and the worktree is dirty.

## 3. Signing reconciliation

Independent read-only fingerprint calculation used the embedded client SPKI DER bytes and the local server public PEM. No private key material was printed or copied.

| Source | Key ID | SPKI | Status |
|---|---|---|---|
| Client `src/entitlement/public-key.js:40-44` | `key-2024-01-prod` | `0a1dab40cb5b8782bf6543d0d2885c81e5ccc2b0a60b8b0bf957e984eb920dc3` | VERIFIED — LOCAL ONLY |
| Local server `keys/public-key.pem` | `key-2024-01-prod` | `0e286050e61a95f22f716acc6686be3db18aceb544b4f6548d8a99f29ce06b8d` | VERIFIED — LOCAL ONLY |
| Production signer | unavailable | unavailable | NOT VERIFIED |

The local client and local server public materials differ despite the same key ID. Production runtime key ID, signer public SPKI, and runtime signer identity are not currently established.

```text
SIGNING: OPERATOR DECISION REQUIRED
```

Decision A is intentionally not selected. The operator must choose A, B, C, D, or E only after authoritative production public-key evidence is available.

## 4. Database evidence

The client has no database or migration surface. Current server production schema and data were not inspected in this gate. Historical evidence remains historical and is not promoted to current production verification.

```text
PRODUCTION DB: NOT VERIFIED
```

## 5. 0008 uniqueness

This is a server-owned gate. Current local server source and migration evidence indicate the intended invariant is `(provider, provider_event_id)` and local tests pass. Production catalog and duplicate scans were not available to the client gate.

```text
0008 UNIQUENESS: PASS — LOCAL ONLY
```

## 6. Image provenance

The client has no Docker image surface. The server local image digest does not establish client artifact provenance or deployment identity.

```text
CLIENT ARTIFACT: PASS — LOCAL ONLY
IMAGE PROVENANCE: NOT VERIFIED
```

Client package dry-run was local `@flotic/minitok@1.3.0`; registry read-only version is also `1.3.0`, but the dirty local package is not an immutable candidate artifact.

## 7. Public parity

Read-only public inspection observed:

- public client installation version: `1.3.0`
- API health version: `0.1.0`
- `/v1` API language
- Dodo checkout with `planId: "pro"`
- activation with `installation_id`
- signed expiry and zero offline-grace language
- login, signup, pricing, docs, checkout, and success pages reachable
- public pricing identity: minitok Pro, `$3.99/month`, up to 3 devices

No authoritative deployment metadata tied the public runtime to the reviewed client SHA or an immutable client/server pair.

```text
PUBLIC PARITY: BLOCKED
```

## 8. Stripe/Dodo policy

Client inventory shows Dodo as the default checkout path and explicit legacy Stripe compatibility remains in portal/CLI boundaries, including `--stripe` behavior. No authoritative policy selects isolated legacy compatibility or removal.

```text
STRIPE/DODO POLICY: OPERATOR DECISION REQUIRED
```

Option A requires Dodo canonical, explicit Stripe legacy boundaries, no accidental defaulting, provider identity everywhere, provider-scoped uniqueness, boundary documentation, and cross-provider tests. Option B requires removal of Stripe routes, dependencies, configuration, tests, documentation, and obsolete provider code before RC. No option is selected here.

## 9. Immutable source preparation

- CLIENT SHA: `c37927d8f158f8d2c963635cac9ad648b530412f`
- SERVER SHA: `c49a699eb46cc1c846d771523049240a945f097f`
- CLIENT WORKTREE CLEAN?: NO
- SERVER WORKTREE CLEAN?: NO
- PAIR RELATIONSHIP: documented as a proposed CV-65 pair only; not immutable, tagged, or release-approved

Release-relevant areas reviewed: product code, security changes, entitlement/runtime behavior, database migrations, Docker/deployment surfaces, website/docs, provider integrations, and tests. Dirty paths were not cleaned or quarantined.

```text
IMMUTABLE SOURCE PAIR: BLOCKED
```

## 10. Version identity

| Layer | Identity | Status |
|---|---|---|
| Source version | `@flotic/minitok@1.3.0` | Local dirty source |
| Artifact version | `1.3.0` package dry-run | PASS — LOCAL ONLY |
| Public version | `1.3.0` installation/docs | Observed public |
| Deployed version | Not tied to reviewed SHA/artifact | NOT VERIFIED |

No version was changed.

## 11. Commercial gate preparation

No customer, subscription, payment, refund, cancellation, expiry, recovery, or webhook operation was performed. Required merchant/product/plan mapping, sandbox credentials, webhook secret and endpoint, and full Dodo lifecycle evidence remain outside this gate.

```text
DODO COMMERCIAL LIFECYCLE: SEPARATE AUTHORIZED COMMERCIAL GATE
```

## 12. Prohibited operations

NONE PERFORMED. No version bump, commit, tag, push, npm publish, Docker publish, deployment, production DB operation, secret modification, key rotation, private-key exposure, Dodo customer/subscription creation, payment, or webhook simulation occurred.

## 13. Client blocker matrix

| Blocker | Technical State | Evidence Available | Production Access Needed | Operator Decision | Status |
|---|---|---|---:|---:|---|
| Signing identity | Client/local mismatch; production unknown | Independent local SPKI calculation | Yes | Yes | OPERATOR DECISION REQUIRED |
| Production DB schema | Server-owned; not inspected | Historical evidence only | Yes | No | NOT VERIFIED |
| DB adoption | Server-owned | No current adoption proof | Yes | Yes | BLOCKED |
| 0008 uniqueness | Client not authoritative | Local server/source evidence | Yes | No | PASS — LOCAL ONLY |
| Immutable source | Dirty client/server worktrees | HEADs and status inventory | No | Yes | BLOCKED |
| Client artifact | Dry-run only; dirty source | npm pack dry-run; registry 1.3.0 | No | Yes | PASS — LOCAL ONLY |
| Server image | Server-owned local build only | Local digest | Yes | No | PASS — LOCAL ONLY |
| Image provenance | No registry/deployment/runtime chain | Local digest only | Yes | No | NOT VERIFIED |
| Public parity | Public runtime unbound | Read-only HTTP markers | Yes | No | BLOCKED |
| Stripe/Dodo policy | Dodo default, Stripe compatibility reachable | Source and tests | No | Yes | OPERATOR DECISION REQUIRED |
| Security | Current tests pass on dirty source | 71/71 and 503/503 | No | No | PASS — LOCAL ONLY |
| Dodo commercial lifecycle | Not authorized/performed | Checklist only | Yes | Yes | SEPARATE COMMERCIAL GATE |

## 14. Operator action register

1. Provide authoritative production signer key ID and public SPKI fingerprint; choose signing authority A–E.
2. Review and authorize a clean immutable client/server source pair; do not treat current dirty HEADs as RC identity.
3. Choose Stripe Option A or Option B.
4. Provide source-to-artifact and deployment/runtime identity evidence before public parity can close.
5. Authorize the separate Dodo commercial lifecycle gate if commercial approval is required.

## 15. Final decision

```text
SIGNING: OPERATOR DECISION REQUIRED
PRODUCTION DB: NOT VERIFIED
DB ADOPTION: BLOCKED
0008 UNIQUENESS: PASS — LOCAL ONLY
CLIENT ARTIFACT: PASS — LOCAL ONLY
IMAGE PROVENANCE: NOT VERIFIED
PUBLIC PARITY: BLOCKED
STRIPE/DODO POLICY: OPERATOR DECISION REQUIRED
DODO COMMERCIAL GATE: SEPARATE AUTHORIZED COMMERCIAL GATE
READY FOR VERSION BUMP: NO
READY FOR IMMUTABLE RC: NO
PRODUCTION READY: NO
```
