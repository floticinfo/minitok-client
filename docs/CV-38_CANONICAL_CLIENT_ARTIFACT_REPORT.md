# CV-38 — Canonical Client Artifact Reconciliation Report

Date: 2026-08-29
Agent: CV-38
Package: `@flotic/minitok`
Version: `1.3.0`
Publication: **Not performed**

## Decision

The canonical source identity is commit `c37927d` (`release: v1.3.0 installation-bound entitlements`) in `C:\Users\J1\minitok-client-release`. It is the only reviewed 1.3.0 release commit and contains the installation-bound entitlement implementation, Ed25519 verification, strict artifact validation, and version metadata.

The final canonical working source is that commit plus the reviewed post-commit hardening already present in the working tree and reconciled for this artifact:

- zero offline grace; expired signed entitlements remain denied;
- unsigned or mutable gate state is never authorization authority;
- installation binding is mandatory for runtime authorization;
- server-side `/v1/validate` is used by online entitlement checks;
- checkout uses `/v1/checkout/dodo` and `{ planId }`;
- activation uses `{ key, installation_id }` and no stale `hostname` field;
- legacy unbound artifacts are denied by the runtime gate;
- Ed25519 verification and canonical signed payload validation remain enabled;
- provider aliases and runtime lifecycle implementation are retained;
- package and runtime version remain `1.3.0`.

The published npm 1.3.0 artifact was not selected as canonical because CV-36 proved that it was materially stale and did not match this hardened source contract.

## Package identity and metadata

| Field | Verified value |
|---|---|
| name | `@flotic/minitok` |
| version | `1.3.0` |
| bin | `minitok: bin/minitok.js` |
| license | `UNLICENSED` |
| engines | Node `>=20.0.0` |
| package files | `bin/`, `src/`, test exclusion `!src/**/*.test.js`, `LICENSE`, `README.md`, `CHANGELOG.md` |
| final tarball | `flotic-minitok-1.3.0.tgz` |
| SHA-256 | `4FF9EBE2BADCAD59875A9F2DD11569FFF3A523AAA0C4457A7CB9A161677393A` |
| npm shasum | `a59aad27512391cef9eb0e21b1ed9e205d17c02f` |
| package file count | 71 |

## Source and artifact comparison

### Git and source states

- Historical repository `minitok-history-rewrite\minitok-client` is tagged `v1.2.0` at `286fbb2`; it is not the 1.3.0 canonical source.
- Active release repository HEAD is `c37927d`, branch `master`, with release branch `release/v1.3.0-recovery`.
- The active working tree contains the later CV-33/CV-36 hardening files and changes, including `src/entitlement/online.js`, its executable test, privacy controls, attack-matrix tests, and contract corrections.
- No server or website files were modified.

### Classification

| Difference | Classification | Resolution |
|---|---|---|
| `OFFLINE_GRACE_DAYS = 30` in published artifact vs `0` locally | Security fix; stale published change | Canonical source uses zero grace. |
| Published checkout payload `plan_id` vs current server contract `planId` | API contract change; stale published change | Canonical source sends `{ planId }`. |
| Published checkout compatibility path vs canonical Dodo endpoint | Intended provider normalization; stale compatibility | Canonical source uses `/v1/checkout/dodo`. |
| Published activation request included `hostname` | API contract mismatch; accidental/stale change | Removed from canonical activation payload. |
| Published activation-key provider-neutral wording vs Dodo contract | Intended provider alias/configuration normalization | Canonical source uses Dodo payment field. |
| Published artifact omitted `src/entitlement/online.js` and online tests | Security fix; incomplete release artifact | Included in source and final package runtime files; tests remain excluded from package. |
| Published artifact lacked the complete hardened entitlement file set | Security fix; incomplete release artifact | Canonical package includes `gate.js`, `model.js`, `verify.js`, `store.js`, `public-key.js`, and `online.js`. |
| Published package metadata and local metadata both identify 1.3.0 | Release-only metadata | Retained and verified. |
| `plan_id` inside signed entitlement schema | API/data contract, not checkout request naming | Retained; it is the canonical entitlement payload field. |
| Ed25519 public-key verification | Security fix | Retained. |
| installation binding and strict UUID validation | Security fix | Retained. |
| provider aliases and runtime lifecycle | Intended implementation | Retained. |

## Canonical behavior verification

The hardened client now requires a valid Ed25519-signed entitlement, validates signed expiry, rejects legacy unbound artifacts, checks installation binding, detects clock rollback, and performs online server validation when an installation token and server URL are available. Local gate state records validation history but cannot authorize access or resurrect an expired artifact.

The entitlement security matrix reported 42/42 passing cases and covered tampering, signature forgery, local-state manipulation, clock rollback, cross-machine copying, legacy artifacts, server revocation, expiry, restart recovery, and relogin recovery.

## Tests and packaging

Required commands:

| Command | Result |
|---|---|
| `npm test` | PASS — 71 tests, 71 passed, 0 failed |
| `npm run lint` | PASS — configured script returned `lint ok` |
| `npm pack --dry-run` | PASS — package identity and 71-file contents verified |
| focused security/regression suites | PASS — 143 tests, 143 passed, 0 failed |
| all `tests/*.js` in one process | NOT PASS — 497/503 passed; six failures are stale/environment-sensitive tests, including old provider-count expectations, old legacy-allow expectation, old Stripe compatibility expectation, and runtime assumptions incompatible with online entitlement hardening |
| `git diff --check` | PASS |

The six failures were not treated as a pass. The focused CV-33, entitlement, installation-binding, online-validation, privacy, provider, and regression suites passed; the stale tests require separate contract-test maintenance and are not evidence against the selected hardened behavior.

## Final package contents

`npm pack --dry-run` verified package contents include:

- `bin/minitok.js`;
- production `src/` runtime, CLI, provider, entitlement, privacy, pipeline, and workspace files;
- `src/entitlement/online.js`;
- `src/entitlement/package.json`;
- `LICENSE`, `README.md`, and `CHANGELOG.md`.

Excluded content was verified not to be packaged:

- `tests/`;
- `src/**/*.test.js`;
- audit reports and repository-only policy/data-classification files;
- local tarballs and other root working-tree artifacts.

The final tarball was created from the reconciled source after the activation payload correction. Its SHA-256 is `4FF9EBE2BADCAD59875A9F2DD11569FFF3A523AAA0C4457A7CB9A161677393A`.

## Clean installation evidence

A clean temporary npm prefix was used at:

`C:\Users\J1\AppData\Local\Temp\kilo\cv38-prefix2`

Installation of `flotic-minitok-1.3.0.tgz` succeeded. The packed executable returned:

- `minitok --version` → `minitok 1.3.0`;
- `minitok --help` → command list including `doctor`, `migrate`, `auth`, `models`, and `runtime`;
- `minitok auth status` → command executed successfully and reported credential state.

`minitok doctor` and `minitok models` executed from the packed install. Doctor correctly reported unavailable configured roles as failures rather than falsely passing. Runtime lifecycle and migration could not be promoted to PASS in the clean prefix because the isolated workspace was not an initialized Git repository and the command sequence timed out while provider model discovery was active. No entitlement or paid server prerequisites were available for an authenticated runtime lifecycle.

The clean-install limitations are recorded as NOT VERIFIED, not PASS. CV-36 independently recorded successful clean installation and `minitok 1.3.0` verification against the published artifact, while also documenting the published artifact contract mismatch that this reconciliation resolves.

## Publication status

Publication was not authorized and was not attempted. The exact publish-ready artifact is:

`C:\Users\J1\minitok-client-release\flotic-minitok-1.3.0.tgz`

SHA-256:

`4FF9EBE2BADCAD59875A9F2DD11569FFF3A523AAA0C4457A7CB9A161677393A`

The npm registry's existing 1.3.0 artifact remains stale and must not be treated as this canonical artifact. Publishing or replacing it requires explicit release authorization and an immutable registry/provenance decision.

## Final status

**RECONCILED / NOT PUBLISHED.** The local source and final tarball agree on the hardened client contract and version 1.3.0. Full all-test aggregation and live paid/runtime prerequisites remain explicitly recorded as non-passing or not verified; no disagreement with the stale published artifact remains unresolved in the selected canonical source state.
