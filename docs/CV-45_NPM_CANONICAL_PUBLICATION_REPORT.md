# CV-45 — Canonical npm 1.3.0 Publication Report

Date: 2026-08-29
Package: `@flotic/minitok`
Version: `1.3.0`
Canonical source: `C:\Users\J1\minitok-client-release`
Canonical commit: `c37927d` plus reviewed CV-38 hardening changes
Publication: **Not performed**

## Decision

**CASE B — RELEASE BLOCKER.** npm currently serves an existing `1.3.0`. npm package versions are immutable; no safe official overwrite or `--force` replacement was attempted. The operator must decide whether a subsequent release version is authorized and required. Publication was also not authorized by this task.

The existing registry artifact is stale and must not be treated as the canonical hardened release.

## Source reconciliation

**PASS** for the reviewed source contract. The source tree contains and retains the CV-38 reconciliation for package metadata, `package-lock.json`, `src/core/version.js`, CLI/bin behavior, entitlement model/gate/store/verification/public key/online validation, checkout, activation, provider/runtime behavior, README, and CHANGELOG.

Verified hardened contract:

- version remains `1.3.0` everywhere required;
- offline grace is zero and expired signed entitlements remain denied;
- checkout uses Dodo `/v1/checkout/dodo` and `{ planId }`;
- activation uses `{ key, installation_id }`;
- online entitlement validation uses server `/v1/validate`;
- installation binding and Ed25519 signed entitlement validation are enforced;
- local entitlement state is not authorization authority;
- `src/entitlement/online.js` and `src/evolution/privacy.js` are included in the local package but absent from the registry package.

## Package contract

| Field | Local canonical value |
|---|---|
| name | `@flotic/minitok` |
| version | `1.3.0` |
| license | `UNLICENSED` |
| engines | `node >=20.0.0` |
| bin | `minitok: bin/minitok.js` |
| files | `bin/`, `src/`, excludes `!src/**/*.test.js`, plus `LICENSE`, `README.md`, `CHANGELOG.md` |
| repository | `https://github.com/floticinfo/minitok-client` |
| homepage | `https://minitok.dev` |
| bugs | `https://github.com/floticinfo/minitok-client/issues` |
| publishConfig | `{ "access": "public" }` |

Registry metadata matched identity, version, license, engines, bin, homepage, bugs, and publish access. Registry metadata formats the repository URL as `git+https://...`; this is semantically the same repository.

## Tarball

**PASS** for generation and package identity. `npm pack --dry-run` reported `@flotic/minitok@1.3.0`, 71 files, and no test files. The generated tarball is:

`C:\Users\J1\minitok-client-release\flotic-minitok-1.3.0.tgz`

Current generated SHA-256:

`D72C892CD1791EE1E73DDF8174000FBFC896669429F89984CEA261A2D6B0AC43`

The CV-38 reference SHA-256 was `4FF9EBE2BADCAD59875A9F2DD11569FFF3A523AAA0C4457A7CB9A161677393A`. The difference is recorded rather than silently accepted: npm tarballs can differ at the gzip-byte level across pack operations while retaining the same package shasum; the current local regenerated file must be treated as the artifact actually available for publication review.

## Clean install

**PASS** for the requested commands. Installation succeeded in clean prefix:

`C:\Users\J1\AppData\Local\Temp\kilo\cv45-prefix`

Results:

- `minitok --version` → `minitok 1.3.0`;
- `minitok --help` → command list including `doctor`, `migrate`, `auth`, `models`, and runtime commands;
- `minitok doctor` → executed; Node/npm/git and configured provider checks passed, while unavailable Claude role adapters were correctly reported as failures;
- `minitok models` → executed and listed configured provider models;
- `minitok auth status` → executed and reported stored credential state.

`migrate` was not run because it mutates workspace state and was not necessary to establish installability. No paid entitlement or authenticated lifecycle was exercised.

## Registry comparison

**FAIL** — registry `1.3.0` does not match the local canonical artifact.

Registry package retrieved from npm:

- registry SHA-256: `4FF9EBE2BADCAD59875A9F2DD11569FFF3A523AAA0C4457A7CB9A161677393A`;
- registry metadata reports 69 files and 249,555 unpacked bytes;
- local package contains 71 files and 254,351 unpacked bytes.

File-level comparison:

| Difference | Classification |
|---|---|
| `bin/minitok.js` | different; hardened CLI contract |
| `README.md` | different; release documentation drift |
| `src/cli/commands/activate.js` | different; activation payload contract |
| `src/cli/commands/activation-key.js` | different; provider/activation contract |
| `src/cli/commands/checkout.js` | different; Dodo endpoint and `planId` contract |
| `src/entitlement/gate.js` | different; entitlement authorization hardening |
| `src/entitlement/model.js` | different; signed payload/installation validation |
| `src/pipeline/loop.js` | different; runtime entitlement integration |
| `src/runtime/entitlement.js` | different; online validation integration |
| `src/entitlement/online.js` | local-only; online entitlement validation |
| `src/evolution/privacy.js` | local-only; privacy/consent control |

The registry artifact is therefore materially stale, not a byte-equivalent canonical release.

## Verification

- `npm test`: PASS — 71 tests passed, 0 failed.
- `npm run lint`: PASS — configured script returned `lint ok`.
- `git diff --check`: PASS.

## Publication status

**NOT AUTHORIZED.** No npm publish, overwrite, or force operation was performed. Because the existing npm `1.3.0` cannot be safely overwritten under immutable-version policy, publication of the hardened source requires an operator-authorized subsequent version/release decision.

## Final status

- SOURCE RECONCILIATION: PASS
- TARBALL: PASS
- CLEAN INSTALL: PASS
- REGISTRY MATCH: FAIL
- PUBLICATION: NOT AUTHORIZED
- RELEASE IMPACT: BLOCKER
