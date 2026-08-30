# CV-58 Client Release Blocker Resolution Report

- Date: 2026-08-29
- Repository: `C:\Users\J1\minitok-client-release`
- Publication: not performed

## Decision

**RELEASE BLOCKED.** Client controlled tests and syntax lint pass, but the source tree is dirty, the hardened source is not represented by an immutable release ref, the existing registry `1.3.0` is stale relative to the audited hardened source, and client/server signing material is not reconciled.

## Changes

- `package.json`: replaced the placeholder lint command with recursive Node syntax checks. Version remains `1.3.0`.
- Existing hardened entitlement, privacy, online validation, activation, checkout, and runtime changes were preserved; no unreviewed experimental files were removed.

## Classification A-G

A/B/C: hardened entitlement, installation-bound activation, Dodo checkout, online validation, runtime authorization, and privacy source are release/security/bug-fix candidate changes.

D: README and release documentation require final version and contract reconciliation.

E: tests and test output are QA evidence.

F: tarballs, logs, audit artifacts, and experiments remain preserved and are not release contents.

G: release authorization, immutable source identity, server signing key, and publication identity remain unresolved.

## Evidence

- `npm test`: PASS, 71/71.
- `npm run lint`: PASS, recursive `node --check` over `bin/` and `src/`.
- `npm pack --dry-run --json`: PASS locally, 71 files; this is a dirty-source 1.3.0 dry run, not an approved artifact.
- `git diff --check`: PASS for client changes, with line-ending warnings only.
- No npm publication, replacement of registry 1.3.0, or clean-prefix customer installation was performed in this cycle.
- Client trusted-key SPKI fingerprint differs from the available local server public-key fingerprint; production signer remains unknown.

## Matrix

| Gate | Result |
|---|---|
| Tests | PASS |
| Substantive syntax lint | PASS |
| Pack dry run | PASS locally, not canonical |
| Immutable source | FAIL |
| Existing registry artifact parity | FAIL/BLOCKED |
| Signing-key reconciliation | FAIL |
| Clean customer install | NOT VERIFIED |
| Version 1.4.0 | Not established |

## Unresolved blockers

1. Dirty source and no immutable release ref.
2. Existing registry 1.3.0 cannot be replaced and is stale relative to hardened local source.
3. Client/server signing public keys differ; no rotation was performed.
4. Server production image, database, website deployment, and paid lifecycle remain unverified.

## Final status

Ready for planner verification: **YES**. Release decision: **RELEASE CANDIDATE BLOCKED**.

RELEASE CANDIDATE BLOCKED
