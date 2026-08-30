# CV-59 Client Release Identity Report

- Date: 2026-08-29
- Repository: `C:\Users\J1\minitok-client-release`
- Evidence classes: STATIC INSPECTION, CONTROLLED TEST, LOCAL ONLY, REAL PRODUCTION, NOT VERIFIED.

## Current identity

- Package: `@flotic/minitok`
- Source/package version: `1.3.0`
- Public npm latest: `1.3.0` — REAL PRODUCTION / PUBLIC REGISTRY INSPECTION
- HEAD: `c37927d` (`release: v1.3.0 installation-bound entitlements`)
- Tags: `v1.1.0`, `v1.1.4`, `v1.2.0`; no immutable `v1.3.0` tag in this repository
- Working tree: modified and untracked release-related files — STATIC INSPECTION

## Coherence review

Local source paths are substantively aligned with the reviewed hardened contract: `/v1`, Dodo checkout with `{ planId }`, activation with `{ key, installation_id }`, installation-bound entitlement checks, and zero offline grace. Client tests passed 71/71 and syntax lint passed — CONTROLLED TEST.

The identity is not freeze-ready. `README.md`, `CHANGELOG.md`, historical audit material, and package metadata still contain old-version and/or historical 30-day-grace claims; the working tree includes uncommitted hardened changes and no immutable candidate tag. Existing npm `1.3.0` is immutable stale history and was not modified.

## Key verification

- Client trusted `key_id`: `key-2024-01-prod`
- Client trusted SPKI SHA-256: `0a1dab40cb5b8782bf6543d0d2885c81e5ccc2b0a60b8b0bf957e984eb920dc3`
- Available local server SPKI: `0e286050e61a95f22f716acc6686be3db18aceb544b4f6548d8a99f29ce06b8d`
- Result: key ID matches, public key material does not — LOCAL ONLY
- Production key: NOT VERIFIED

## Artifact and install

The existing local `flotic-minitok-1.3.0.tgz` contains 71 packaged files and installs into a clean prefix. `minitok --version`, `--help`, `doctor`, `models`, and `auth status` ran — CONTROLLED TEST. This validates only the stale `1.3.0` artifact, not a candidate `1.4.0` artifact. Paid runtime and real Dodo lifecycle remain NOT VERIFIED.

## Decision

VERSION BUMP BLOCKED. READY FOR VERSION BUMP: NO. A clean source freeze, authorized key reconciliation, immutable candidate identity, and candidate artifact verification are required before changing the version.
