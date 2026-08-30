# CV-68 Release Source Lock Report — Client

Date: 2026-08-29
Repository: `C:\Users\J1\minitok-client-release`
Scope: read-only release-source lock, contract, artifact, signing, parity, and operator preparation. Runtime code, version, Git state, registry state, deployment state, payment state, and keys were not modified.

## Decision

```text
READY FOR VERSION BUMP: NO
READY FOR IMMUTABLE RC: NO
PRODUCTION READY: NO
SOURCE LOCK: NOT APPROVED
```

The client is locally test-green but not an immutable release source. The worktree is dirty and contains release-relevant changes outside `HEAD`.

## CV-63–CV-67 baseline

- `HEAD`: `c37927d8f158f8d2c963635cac9ad648b530412f`; branch `master`; tags `v1.1.0`, `v1.1.4`, `v1.2.0`.
- Package: `@flotic/minitok@1.3.0`.
- Latest recorded inventory: 17 modified tracked paths and 23 untracked paths; current `git status` confirms dirty source, including package metadata, CLI, entitlement/runtime, pipeline/MCP, tests, audit reports, and local evidence.
- No reviewed file set, clean source SHA, pair tag, or source-to-artifact identity was created.
- Audit reports, tests, captured output, local policy files, and generated evidence are not release package contents. `package.json:35` allowlists `bin/`, production `src/` excluding `src/**/*.test.js`, `LICENSE`, `README.md`, and `CHANGELOG.md`.

## Verification evidence

| Check | Result | Boundary |
|---|---|---|
| `npm test` | PASS, 71/71 | Dirty local source only |
| `npm run lint` | PASS | Recursive Node syntax validation, not semantic lint |
| Broad `node --test` sweep | PASS, 503/503 in CV-64–CV-67 evidence | Dirty local source only |
| `npm pack --dry-run --json` | PASS, 71 files; 68,982 packed bytes; 254,061 unpacked bytes; SHA-1 `fefb428847612b0fa566a941742f165cbe0575f4` | Local dry run, not immutable RC |
| `npm view @flotic/minitok version --json` | `1.3.0` in prior evidence | Does not prove local source provenance |
| `git diff --check` | PASS; line-ending warnings only | Worktree remains dirty |
| Package boundary | PASS by allowlist review | Tests/docs/reports/local evidence excluded |

No client Docker surface exists. No package was published.

## Client/server contract audit

Observed and source-supported contract markers are consistent locally: client checkout uses `POST /v1/checkout/dodo` with `{ planId }` and defaults to `pro` at `src/cli/commands/checkout.js:14-16`; activation uses `key` and `installation_id`; server-side Dodo routing and provider-scoped event handling are documented in the server CV-67 evidence. Online entitlement status is asynchronous and configured online failures deny access; the prior route defect and stale tests were reconciled in CV-63/CV-64 evidence. These are local contract results, not deployed parity proof.

## Signing evidence

Public-only evidence, with no private key read or exposed:

| Material | Key ID | SPKI SHA-256 | Result |
|---|---|---|---|
| Client trusted key, `src/entitlement/public-key.js:40-44` | `key-2024-01-prod` | `0a1dab40cb5b8782bf6543d0d2885c81e5ccc2b0a60b8b0bf957e984eb920dc3` | Local baseline |
| Local server public material | `key-2024-01-prod` | `0e286050e61a95f22f716acc6686be3db18aceb544b4f6548d8a99f29ce06b8d` | Mismatch |
| Production signer/runtime | unavailable | unavailable | NOT VERIFIED |

The Windows PowerShell 5.1-only fingerprint recalculation was unavailable because its ECDSA implementation lacks `ImportFromPem`; this did not access private material. Existing CV-66/CV-67 independent public-only calculations are retained. Recommended signing path: **RECOMMENDED — Option C**, confirm the production public identity first. No signing option is approved and no rotation is authorized.

## DB Strategy C and 0008 boundary

The client owns no database or migration surface. Server evidence records `0000 → 0008` and pre-0008 disposable replay as PASS — LOCAL/DISPOSABLE ONLY. Current server source expresses `(provider, provider_event_id)` uniqueness and removes the legacy global index in 0008, but production catalog, journal, duplicate scans, backup/restore, locks, and adoption state are unavailable. **RECOMMENDED — DB Strategy C**: rehearse against a disposable production-shaped clone, then select Strategy A or B from read-only catalog evidence. No production DB action is approved.

## Stripe/Dodo isolation

Dodo is the canonical/default checkout path. Explicit legacy Stripe compatibility remains reachable in client boundaries, including `--stripe` behavior recorded by CV-65–CV-67. **RECOMMENDED — Stripe Option A**, only with explicit legacy boundaries, no fallback/defaulting, provider identity, provider-scoped uniqueness, documentation, and cross-provider tests. **NOT YET APPROVED**. Option B removal is not selected and would require complete route, dependency, config, test, documentation, and obsolete-field handling review.

## Public parity

Read-only checks on 2026-08-29 returned HTTP 200 for `https://minitok.dev/`, `/docs`, `/pricing`, and `https://api.minitok.dev/health`; health returned `{"status":"ok","version":"0.1.0"}`. Public evidence observes client `1.3.0`, Dodo, `/v1`, `planId`, `installation_id`, signed-expiry/zero-grace wording, and pricing markers. No public source SHA, artifact digest, or runtime deployment identity binds those observations to this dirty client source. **NOT YET APPROVED — public parity blocked for release.**

## Operator approval requirements

1. Review and approve the client release file set; create a clean immutable client/server pair in a later authorized gate.
2. Supply production signer key ID and public SPKI fingerprint only; never supply private material. **RECOMMENDED — Option C; NOT YET APPROVED.**
3. Approve **RECOMMENDED — Strategy C** disposable DB rehearsal and subsequent production-only catalog/adoption gate; **NOT YET APPROVED**.
4. Approve **RECOMMENDED — Stripe Option A** isolation controls; **NOT YET APPROVED**.
5. Bind frozen client SHA → package dry run → approved artifact → deployment/runtime identity, then rerun client tests and parity.
6. Keep Dodo commercial lifecycle in a separate authorized gate; no customer, subscription, payment, refund, chargeback, or webhook action occurred.

## Final evidence checklist

- [x] CV-63 through CV-67 client reports read.
- [x] Dirty source and package boundary audited.
- [x] Client tests, lint, package dry run, and diff check executed or recorded.
- [x] Public signing material compared without private-key exposure.
- [x] Client/server contract reviewed against current source and prior evidence.
- [ ] Immutable source pair.
- [ ] Production signer/runtime fingerprint.
- [ ] Production DB catalog, duplicate, backup/restore, lock, and adoption evidence.
- [ ] Registry/deployment/runtime artifact provenance.
- [ ] Public parity bound to the immutable pair.
- [ ] Operator approval for signing, DB Strategy C follow-on, and Stripe Option A.

PROHIBITED OPERATIONS: NONE PERFORMED
