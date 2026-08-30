# CV-54 — npm Next Release Artifact Report

- Date: 2026-08-29
- Package: `@flotic/minitok`
- Source: `C:\Users\J1\minitok-client-release`
- Scope: canonical hardened client artifact preparation only
- Publication: **Not performed**
- Final status: **ARTIFACT BLOCKED**

## Executive decision

`@flotic/minitok@1.3.0` already exists in the npm registry and is immutable. Therefore:

```text
1.3.0 replacement = NOT POSSIBLE
```

No overwrite, `--force`, unpublish, deletion, or publication was attempted. The registry `1.3.0` is materially different from the current hardened local source and must not be represented as the canonical hardened artifact.

A subsequent version such as `1.3.1` is only a candidate. No version change was made because operator authorization was not provided.

## Source-freeze result

CV-50 explicitly classified the client/server source freeze as **BLOCKED**: the client worktree is dirty, hardened source is outside HEAD `c37927d8f158f8d2c963635cac9ad648b530412f`, and no immutable release ref identifies the complete candidate. This task did not commit, tag, reset, or otherwise alter that state. Consequently, an immutable release artifact cannot be declared ready.

Current client state:

- HEAD: `c37927d8f158f8d2c963635cac9ad648b530412f`
- Branch: `master` tracking `origin/master`
- Version in local package: `1.3.0`
- Working tree: dirty, including hardened tracked changes and untracked hardened source/tests
- Existing local version was intentionally not changed

## Canonical source identity comparison

| Field / contract | Local candidate | Registry `1.3.0` / evidence | Result |
|---|---|---|---|
| package name | `@flotic/minitok` | `@flotic/minitok` | MATCH |
| version | `1.3.0` | `1.3.0` | MATCH, but replacement impossible |
| bin | `minitok: bin/minitok.js` | same metadata | MATCH metadata; source differs |
| engines | `node >=20.0.0` | `node >=20.0.0` | MATCH |
| license | `UNLICENSED` | `UNLICENSED` | MATCH |
| repository | `https://github.com/floticinfo/minitok-client` | `git+https://github.com/floticinfo/minitok-client.git` | Semantic match |
| homepage | `https://minitok.dev` | same | MATCH |
| bugs | `https://github.com/floticinfo/minitok-client/issues` | same | MATCH |
| files | `bin/`, `src/`, test exclusion, license/docs | registry reports 69 files | Local candidate includes hardened runtime files absent from registry |
| checkout | Dodo `/v1/checkout/dodo`, `{ planId }` | stale package differs | LOCAL HARDENED |
| activation | `{ key, installation_id }` | stale package differs | LOCAL HARDENED |
| entitlement | installation-bound signed payload; legacy not runtime-authorized | stale package differs | LOCAL HARDENED |
| online validation | `/v1/validate` integrated into runtime entitlement status | absent/different in registry artifact | LOCAL HARDENED |
| installation binding | UUID installation identity checked against entitlement | stale package differs | LOCAL HARDENED |
| offline grace | zero; no post-expiry grace | stale package differs | LOCAL HARDENED |
| signing key | `key-2024-01-prod` public-key registry contract | package identity metadata does not establish runtime reconciliation | Source contract present; exact server key fingerprint remains CV-50 blocker |
| provider contract | Dodo production checkout path | stale package differs | LOCAL HARDENED |

## Registry comparison

Registry metadata was read with `npm view @flotic/minitok@1.3.0 --json`:

- registry SHA-1 shasum: `459ce2324c138b1ca9753def0d9fdf2dda2ca2d8`
- registry SHA-512 integrity: `sha512-OsxUn5V65UKQs6amGM1qMZnpFxuU9pp6t6eEx+AQqIM57x9tdvCZev4TLLYY5vAbc/rjJjk2iSF3d/fb0ljMJA==`
- registry file count: `69`
- registry unpacked size: `249555` bytes
- registry gitHead: `c37927d8f158f8d2c963635cac9ad648b530412f`

CV-45's comparison records the local hardened package as 71 files / 254,351 unpacked bytes, with material differences in `bin/minitok.js`, README, activation, checkout, entitlement gate/model, pipeline/runtime entitlement, and local-only `src/entitlement/online.js` and `src/evolution/privacy.js`. This difference is intentionally disclosed.

## Artifact preparation

`npm pack` / equivalent local tarball generation was not repeated against the unfreezable dirty source. CV-45 records the previously generated local candidate:

- path: `C:\Users\J1\minitok-client-release\flotic-minitok-1.3.0.tgz`
- recorded local SHA-256: `D72C892CD1791EE1E73DDF8174000FBFC896669429F89984CEA261A2D6B0AC43`
- recorded local package result: 71 files, no test files

This tarball is not promoted as an immutable CV-54 release artifact because source freeze failed and version authorization is absent. No npm publish occurred.

Required artifact checks from the prior local candidate report:

- package contents: PASS in CV-45, pending immutable re-run after authorized freeze
- no tests: PASS in CV-45
- no secrets: not independently re-established for a frozen CV-54 artifact
- no local tarballs/reports: not independently re-established for a frozen CV-54 artifact
- correct bin/version/runtime files: PASS for local candidate in CV-45
- SHA-256: recorded above
- npm shasum/integrity: registry values recorded above; local candidate was not published and therefore has no registry integrity

## Clean installation evidence

CV-45 records a successful clean-prefix install in:

`C:\Users\J1\AppData\Local\Temp\kilo\cv45-prefix`

Recorded checks:

- `minitok --version` → `minitok 1.3.0`
- `minitok --help` → includes `doctor`, `migrate`, `auth`, and `models`
- `minitok doctor` → executed
- `minitok auth status` → executed
- `minitok models` → executed
- `minitok migrate` → not run because it mutates workspace state; initialized-workspace migration evidence is therefore absent from this report

## Verification

- `npm test`: PASS — 71 tests passed, 0 failed
- `npm run lint`: PASS — `lint ok`
- `git diff --check`: PASS for the client worktree, with line-ending warnings only
- `npm publish`: NOT RUN
- `--force`: NOT RUN
- registry deletion/unpublish: NOT RUN
- version mutation: NOT RUN

## Blocking conditions

1. Existing npm `1.3.0` is immutable; replacement is not possible.
2. CV-50 source freeze is blocked by dirty, non-immutable client/server candidate state.
3. No operator-authorized subsequent version exists; `1.3.1` is only an unapproved candidate.
4. Exact server runtime signing-key material was not cryptographically reconciled in CV-50.
5. A fresh CV-54 deterministic pack and all artifact-content checks must be rerun only after an authorized, immutable source freeze.
6. `migrate` was not exercised in an initialized Git workspace in the available clean-install evidence.

## Final status

# ARTIFACT BLOCKED

The hardened source is materially different from the immutable registry `1.3.0`, but it cannot be released as a canonical immutable npm artifact until the source is frozen at an authorized immutable release ref and an operator authorizes a new version. No registry mutation or publication was performed.
