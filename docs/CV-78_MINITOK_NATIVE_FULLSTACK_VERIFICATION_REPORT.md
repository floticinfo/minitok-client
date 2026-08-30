# CV-78 minitok-native Full-Stack Verification Report

## Scope
Local-only CV-78 verification. Production systems, endpoints, databases, credentials, payment providers, signing identities, deployment, registry, and Git mutation were not accessed or changed.

## Environment
- Native CLI: `minitok 1.3.0`.
- Client: `@flotic/minitok@1.3.0`, Node 24.15.0.
- Server: `minitok-server@0.1.0`.
- Existing local Docker Compose server/PostgreSQL only; no production endpoint used.
- Native client runtime used loopback `127.0.0.1:4578`.

## minitok-native execution
PASS for `minitok --version`, `--help`, `doctor`, `status`, runtime start/status/stop. `doctor` reported configured Claude role adapters unavailable; this did not affect local runtime checks. Native runtime HTTP evidence: `GET /health` returned 200 and `GET /api/v1/status` returned 200 with local Pro entitlement state.

## Repository architecture
Client CLI exposes checkout, activation-key, activation, status, and runtime commands. Client online validation posts installation token and entitlement to `/v1/validate`. Server exposes auth, Dodo checkout, Dodo webhook, activation-key, activation, and validation routes. Server signing loads `ED25519_PRIVATE_KEY_PATH`, `ED25519_KEY_ID`, and `ED25519_PUBLIC_KEYS`. Dodo checkout uses `checkoutSessions.create()`; webhook events use a provider-scoped router and idempotency key.

## Disposable fixture identity
The signing tests generated an in-memory Ed25519 identity with key ID `key-cv78-local` as the requested disposable identity. Private material was not persisted, printed, reported, or packaged. The canonical live Compose stack has no mounted disposable key fixture. No Dodo mock HTTP service exists in either repository.

## Signing evidence
Server signer and client-compatible verifier passed in `test/signer.test.js`: valid signature, tampered payload rejection, unknown key ID rejection, wrong public key rejection, and key rotation behavior. This is test/in-process evidence, not live Compose evidence.

## Dodo mock evidence
Existing Dodo mock/injected lifecycle passed: checkout session creation, `payment.succeeded`, `subscription.active`, activation-key creation, one-time retrieval, activation, entitlement verification, and paid validation. Duplicate webhook and provider event behavior passed in idempotency tests. No network Dodo mock was available, so Dodo checkout/webhook are not live HTTP evidence.

## Database and migration evidence
Existing local PostgreSQL container was healthy. `GET http://127.0.0.1:3000/health` returned `{"status":"ok","version":"0.1.0"}`. Direct local DB inspection reported 10 rows in `drizzle.__drizzle_migrations` and required tables: `activation_keys`, `billing_events`, `customers`, `entitlement_records`, `installations`, `plans`, and `subscriptions`. No temporary CV-78 rows were created.

## Checkout, webhook, activation, entitlement
Mocked/injected lifecycle: PASS as test evidence. Live HTTP: NOT VERIFIED because the server lacks a local Dodo mock and mounted disposable signing identity. The canonical server remained suitable for health/schema/fail-closed checks only.

## Client validation and paid execution
Native client runtime: PASS for local runtime health/status. Live client-to-server `/v1/validate` with a newly activated local entitlement: NOT VERIFIED. Valid, missing, expired, tampered, wrong-installation, wrong-customer, and server-rejected paid gates are covered by client/server security tests, but are not promoted to live runtime evidence. Therefore live paid execution is NOT VERIFIED.

## Security negative matrix
| Case | Expected | Actual | Result |
|---|---|---|---|
| Missing entitlement | Deny | Test gate denies | PASS test |
| Malformed/tampered entitlement | Reject | Client/server reject | PASS test |
| Unknown key ID/wrong public key | Reject | Verifier rejects | PASS test |
| Expired entitlement | Deny | Gate rejects | PASS test |
| Wrong installation/customer | Deny | Ownership/binding rejects | PASS test |
| Replay activation key | Reject | Second redemption rejected | PASS test |
| Replay/duplicate provider event | Ignore/idempotent | Duplicate skipped | PASS test |
| Invalid webhook signature | Reject | HTTP/test verifier rejects | PASS test |
| Missing/invalid/expired JWT | Reject | Auth rejects | PASS test |
| Cross-customer/IDOR access | Reject | Authorization rejects | PASS test |

These are correctly classified as unit/integration/Fastify-injection evidence, not live Compose proof.

## Stripe and Dodo invariants
Active Stripe runtime surface: 0, PASS. Historical migration references are not active runtime. Dodo is the canonical active provider in source/tests. Dodo-only: PASS.

## Package evidence
`npm pack --dry-run --json`: version `1.3.0`, 71 files. Tests, reports, `.env`, PEM/private keys, and temporary fixtures were excluded. Package: PASS.

## Documentation parity
README and CLI/source agree on Dodo purchase, activation-key retrieval, activation, entitlement, and runtime surfaces. CV-78 disposable infrastructure is evidence-only and was not added to product documentation. Documentation parity: PASS.

## Runtime/test parity
FAIL. Native client runtime and live server health/database checks passed, while the complete commercial positive path remains mocked/injected rather than live HTTP.

## Failures
P1: none. P2: no local Dodo HTTP mock; canonical Compose has no mounted disposable signing key; live checkout→webhook→activation→validation→paid execution was not established. Existing dirty repository state prevents immutable provenance. Native doctor reports unavailable Claude role adapters.

## Repairs
No product or deployment repair was applied. A temporary local-only SDK base-URL experiment was reverted before reporting. No production behavior was weakened and no bypass was added.

## Production boundary
Production readiness, immutable release readiness, production signing, production DB, production provenance, and public parity are NOT VERIFIED.

## Prohibited-operation audit
Production operations: NONE. Git mutations: NONE. Private production key access: NONE. Production DB access: NONE. Production credentials/secrets were not printed or used.

## Final decision
CV-78 COMPLETE

minitok-native EXECUTION: PASS
LOCAL CLIENT: PASS
LOCAL SERVER: PASS
LOCAL DATABASE: PASS
DISPOSABLE SIGNING: PASS (test/in-process only)
SERVER SIGN: PASS (test/in-process only)
CLIENT VERIFY: PASS (test/in-process only)
DODO CHECKOUT: NOT AVAILABLE live HTTP
DODO WEBHOOK: NOT AVAILABLE live HTTP
WEBHOOK IDEMPOTENCY: PASS (test/in-process)
ACTIVATION: PASS (test/in-process)
ENTITLEMENT: PASS (test/in-process)
CLIENT ONLINE VALIDATION: FAIL live HTTP
PAID EXECUTION: FAIL live HTTP
CLIENT↔SERVER LIVE HTTP INTEGRATION: FAIL
RUNTIME/TEST PARITY: FAIL
SECURITY NEGATIVE MATRIX: PASS (test/integration evidence)
STRIPE ACTIVE SURFACE: 0 / PASS
DODO-ONLY: PASS
PACKAGE: PASS
DOCUMENTATION PARITY: PASS

LOCAL IMPLEMENTATION READY: NO
IMMUTABLE RELEASE READY: NO — not independently proven
PRODUCTION READY: NO — not independently proven

## Remaining blockers and exact next actions
1. Add a disposable, repository-local-only Dodo mock HTTP service exposing checkout session creation and signed webhook delivery.
2. Add a disposable runtime-generated Ed25519 key fixture mounted only into an explicitly named CV-78 Compose project, and register the matching public key in a disposable client test profile without changing production registry entries.
3. Run the complete live HTTP chain against a fresh disposable PostgreSQL database, capture sanitized request/response/DB evidence, then remove the disposable stack and data.

PRODUCTION OPERATIONS: NONE
GIT MUTATIONS: NONE
PRIVATE PRODUCTION KEY ACCESS: NONE
PRODUCTION DB: NOT VERIFIED
PRODUCTION SIGNING: NOT VERIFIED
PRODUCTION PROVENANCE: NOT VERIFIED
PUBLIC PARITY: NOT VERIFIED
