# CV-64 Client Blocker Remediation Report

Date: 2026-08-29
Repository: `C:\Users\J1\minitok-client-release`
Scope: local remediation only. No publish, deployment, payment, production mutation, key rotation, version bump, commit, or tag.

## CV-63 → CV-64

CV-63 reported `498/503` after fixing the async runtime route and classified five remaining failures. CV-64 reproduced the causes from source and remediated the test/fixture contracts without weakening broad coverage.

## Actual changes

- Isolated provider environment variables in the two provider-detection fixtures.
- Updated the runtime entitlement status test to await the async authority.
- Changed the default entitlement test to use an empty disposable directory.
- Updated the checkout source assertion to the current Dodo-default contract.
- Updated MCP status handling to await online-aware entitlement status.
- Changed online validation exceptions to `SERVER_UNREACHABLE` with `allowed: false`, preserving zero offline grace for configured online validation.

## Evidence

- `npm run lint`: PASS.
- `npm test`: 71/71 PASS.
- Broad sweep with provider environment isolation: 503/503 PASS.
- Focused M3/M4/security tests passed within the broad sweep.
- No tests were deleted and no broad sweep was weakened.

## Runtime authority disposition

Local Ed25519 verification remains fail-closed. Server rejection remains denial. When online validation context exists, network exceptions now deny paid execution as `SERVER_UNREACHABLE`; no offline allowance is synthesized. Signed artifacts remain locally bounded by signed expiry only when no online validation context is configured. Mid-run revalidation, local-only CLI status, and local-only evolution upload remain contract items requiring separate product approval.

## Signing key

```text
CURRENT AUTHORIZED SIGNER: UNKNOWN
CLIENT TRUST: MISMATCH against recorded local server fingerprint
LOCAL SERVER: MISMATCH
PRODUCTION: NOT VERIFIED
OPERATOR DECISION: REQUIRED
```

Client fingerprint: `0a1dab40cb5b8782bf6543d0d2885c81e5ccc2b0a60b8b0bf957e984eb920dc3`.
Recorded local server fingerprint: `0e286050e61a95f22f716acc6686be3db18aceb544b4f6548d8a99f29ce06b8d`.
No private material was printed, copied, moved, or rotated.

## Source classification

Current source and security modules are release/security candidates only after review. Tests are TEST/QA. `docs/CV-*.md`, audit text, and generated snapshots are AUDIT EVIDENCE. No automatic deletion was performed. The working tree is dirty, so no immutable client source identity exists.

## Prohibited operations

No npm publish/unpublish/deprecate, Docker push, deployment, production DB change, payment, webhook, customer/subscription creation, key rotation, private-key exposure, commit, tag, reset, revert, force push, or version bump occurred.

## Readiness

```text
READY FOR VERSION BUMP: NO
READY FOR IMMUTABLE RC: NO
PRODUCTION READY: NO
```

The client broad sweep is locally remediated, but immutable source, production signer evidence, public runtime parity, and server/database release decisions remain unresolved.
