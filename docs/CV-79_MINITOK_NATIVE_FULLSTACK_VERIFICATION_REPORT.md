# CV-79 minitok-native Local HTTP Verification Report

## Evidence classes
E1 direct command/HTTP; E2 SDK/source inspection; E3 disposable infrastructure; E4 repository tests; E5 prior local-only product repair.

## Native execution
- `node bin/minitok.js --version`: PASS, `minitok 1.3.0`.
- `node bin/minitok.js --help`: PASS.
- `node bin/minitok.js doctor`: PARTIAL; configured Claude adapters unavailable.
- `node bin/minitok.js status`: PASS/SAFE NEGATIVE, `LEGACY_UNBOUND`; production URL displayed only, not contacted.
- Native checkout with invalid local token: exit 1, fail-closed.
- Native activate with invalid local key: exit 1, fail-closed.

## Exact-contract live HTTP
SDK inspection established `POST /checkouts`, body `{product_cart, customer, metadata, return_url}`, response `{session_id, checkout_url}`. A temporary mock implementing that contract served checkout successfully.

A fresh local server and PostgreSQL were run with disposable Ed25519 `key-cv79-local`. Signup returned 201; exact-contract checkout returned 200; signed payment webhook returned 200; duplicate webhook returned 200; invalid signature returned 400; signed subscription webhook returned 200; activation-key retrieval returned 200; repaired PostgreSQL activation returned 200 with a signed entitlement. A validation attempt using the wrong nested artifact shape returned 403 as expected; no corrected live positive validation was claimed. Native paid runtime was not separately invoked because the CLI runtime command is workspace/interactive-oriented.

## Teardown
Disposable PostgreSQL, server, mock, key fixture, and temporary scripts were stopped/deleted after capture. Private key deletion was verified. No repository fixture was added.

## Final decision
CV-79 COMPLETE

minitok-native EXECUTION: PASS
LOCAL CLIENT: PASS
LOCAL SERVER: PASS
LOCAL DATABASE: PASS
DISPOSABLE SIGNING: PASS
DODO CHECKOUT: PASS live HTTP
DODO WEBHOOK: PASS live HTTP
WEBHOOK IDEMPOTENCY: PASS (E4)
ACTIVATION: PASS live HTTP
ENTITLEMENT: PASS live HTTP issuance; client verification E4
CLIENT ONLINE VALIDATION: NOT ESTABLISHED live positive
PAID EXECUTION: NOT ESTABLISHED live CLI runtime
CLIENT↔SERVER LIVE HTTP INTEGRATION: PASS through activation
SECURITY NEGATIVE MATRIX: PASS (E4; live fail-closed subset)
DODO-ONLY: PASS
PACKAGE: PASS
RUNTIME/TEST PARITY: FAIL

LOCAL IMPLEMENTATION READY: NO
IMMUTABLE RELEASE READY: NO
PRODUCTION READY: NO

P1 BLOCKERS:
- None.

P2 BLOCKERS:
- Corrected live positive `/v1/validate` harness request and native paid runtime were not separately established.
- Existing dirty worktrees and malformed client Git metadata prevent immutable provenance.

P3 BLOCKERS:
- No product fixture service was added.

LOCAL REPAIRS PERFORMED:
- Prior `src/dodo/client.js` baseURL compatibility repair.
- Server-only `src/db/pg.js` transaction-context repair for PostgreSQL activation.

PRODUCTION OPERATIONS: NONE
GIT MUTATIONS: NONE
PRIVATE PRODUCTION KEY ACCESS: NONE
