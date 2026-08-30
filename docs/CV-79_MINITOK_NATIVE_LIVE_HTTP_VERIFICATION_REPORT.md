# CV-79 minitok-native Live HTTP Verification Report

## Scope and evidence classes
Local-only CV-79 verification. No production endpoint, database, credential, signing identity, deployment, or Git mutation was used. E1 direct command/HTTP; E2 source/SDK inspection; E3 disposable infrastructure; E4 repository tests; E5 local product repairs.

## Route and runtime inspection
`POST /v1/validate` requires `{ token, entitlement }`, where entitlement is the complete `{ payload, signature, key_id }` artifact. The client online checker sends the stored artifact unchanged. Native runtime start/status/health/status routes exist, but no standalone noninteractive paid operation exists: paid authorization is performed in `pipeline/loop.js` around the pipeline run, while runtime routes expose knowledge, evidence, observations, compaction, audit, and status only. `minitok run` requires a task and workspace/repository and configured adapters; it is not a deterministic standalone paid probe.

## Live flow (E1/E3)
Fresh PostgreSQL with canonical migrations 0000–0009, exact Dodo `POST /checkouts` mock, repaired server, and ephemeral `key-cv79-local` were used.
- Signup: HTTP 201.
- Checkout: HTTP 200.
- Signed payment webhook: HTTP 200.
- Duplicate signed webhook: HTTP 200/idempotent.
- Invalid webhook signature: HTTP 400.
- Signed subscription webhook: HTTP 200.
- Activation-key retrieval: HTTP 200.
- PostgreSQL activation: HTTP 200 with signed entitlement.
- Correct artifact-shaped `/v1/validate`: HTTP 200, `valid:true`, active installation, Pro subscription.
- Native client verifier: `valid:true`, state `VALID`, correct installation binding and `key-cv79-local`.
- Native client online checker: `allowed:true`, `serverValidated:true`, active Pro subscription.

## Negative matrix (E1/E4)
Missing artifact: 400. Expired, tampered, wrong-installation, and unknown-key artifacts: 403. Native invalid checkout/activate commands exited 1. Existing security suites cover malformed, replay, wrong-key, expiry, ownership, and cancellation cases. Native paid runtime execution was not claimed because no feasible noninteractive paid operation exists in the inspected CLI/runtime surface.

## Teardown
Disposable server, mock, PostgreSQL, client entitlement directory, scripts, and Ed25519 private key were removed. `PRIVATE_KEY_PRESENT=False` verified.

## Final decision
CV-79 COMPLETE

minitok-native EXECUTION: PASS
LOCAL CLIENT: PASS
LOCAL SERVER: PASS
LOCAL DATABASE: PASS
DISPOSABLE SIGNING: PASS
DODO CHECKOUT: PASS live HTTP
DODO WEBHOOK: PASS live HTTP
WEBHOOK IDEMPOTENCY: PASS live HTTP
ACTIVATION: PASS live HTTP
ENTITLEMENT: PASS live HTTP
CLIENT ONLINE VALIDATION: PASS live HTTP
PAID EXECUTION: NOT ESTABLISHED — no noninteractive native paid operation exists
CLIENT↔SERVER LIVE HTTP INTEGRATION: PASS
SECURITY NEGATIVE MATRIX: PASS
DODO-ONLY: PASS
PACKAGE: PASS
DOCUMENTATION PARITY: PASS
RUNTIME/TEST PARITY: PARTIAL — paid pipeline execution not separately run

LOCAL IMPLEMENTATION READY: YES for exercised flow
IMMUTABLE RELEASE READY: NO — pre-existing dirty worktrees/client malformed Git metadata
PRODUCTION READY: NO — local evidence is not production evidence

P1 BLOCKERS:
- None.

P2 BLOCKERS:
- Native paid pipeline execution was not established because the CLI requires a task/workspace and configured adapters; runtime HTTP has no paid operation route.
- Pre-existing dirty worktrees and malformed client `.git/packed-refs` prevent immutable provenance.

P3 BLOCKERS:
- Disposable fixture procedure remains evidence-only.

LOCAL REPAIRS PERFORMED:
- `src/db/pg.js`: transaction-bound PostgreSQL activation context methods.
- `src/api/validation.js`: allow the complete entitlement payload object through Fastify schema validation.
- Prior `src/dodo/client.js`: disposable `baseURL` compatibility repair.

PRODUCTION OPERATIONS: NONE
GIT MUTATIONS: NONE
PRIVATE PRODUCTION KEY ACCESS: NONE
