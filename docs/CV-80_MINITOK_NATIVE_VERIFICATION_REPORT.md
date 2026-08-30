# CV-80 minitok-native Verification Report

## Scope

Disposable local verification only. No production endpoint, database, credential, signing key, payment, customer, subscription, webhook delivery, publish, deployment, or Git mutation was used. Existing dirty state was preserved.

## Capability discovery

minitok 1.3.0 was executed from `minitok-client-release/bin/minitok.js`.

| Capability | Result | Evidence |
|---|---|---|
| CLI/version/help | AVAILABLE | E1: `--version`, `--help` |
| doctor/status | AVAILABLE | E1: doctor and status completed |
| workspace management | AVAILABLE | E1: `cv80-client` and `cv80-server` registered and selected |
| repository context | AVAILABLE | E1: status resolved workspace, repository, type, branch, commit, file count |
| runtime | AVAILABLE | E1: runtime start/status and HTTP health/status |
| pipeline/run | AVAILABLE, fail-closed | E1: task/workspace invocation reached entitlement gate |
| knowledge | AVAILABLE | E1: runtime status reported knowledge outcomes |
| evidence | AVAILABLE | E1: `/api/v1/evidence/collect` recorded server test result |
| observations | AVAILABLE, schema constrained | E1: malformed observation rejected; no false PASS recorded |
| audit | AVAILABLE | E1: `/api/v1/audit/recent` returned append-only entries |

## minitok-native execution

The two repositories were registered as separate workspaces:

- `cv80-client` → `C:\Users\J1\minitok-client-release`
- `cv80-server` → `C:\Users\J1\minitok-server-deploy`

Runtime execution succeeded on localhost only:

- `GET /health` → `{"status":"ok"}`
- `GET /api/v1/status` → entitlement `LEGACY_UNBOUND`, knowledge outcomes present
- evidence collection ran the server test command and recorded `651` passed, `0` failed

The actual pipeline task `Return exactly: CV-80-PASS` was attempted through `minitok run --workspace cv80-client --dry-run --provider-override openai`. It was denied before provider work with `Entitlement LEGACY_UNBOUND`. This is a correct fail-closed result. No provider API call was made and no bypass was attempted.

## CV-79 regression status

CV-79's disposable live HTTP evidence remains the current direct commercial-flow evidence: signup, checkout, signed payment webhook, subscription webhook, activation-key retrieval, activation, `/v1/validate`, native client verification, and native online validation all passed. CV-80 did not repeat a new paid external or provider operation because production and real payment operations are prohibited. The lifecycle is therefore classified as `INHERITED E1/E3 BASELINE`, not newly executed CV-80 E1.

## Paid gate assessment

Source and execution evidence agree:

`CLI → task/workspace → pipeline → online entitlement gate → provider`

The gate is checked in `src/pipeline/loop.js:121-145`, before provider creation/work. Missing, legacy-unbound, malformed, expired, wrong-installation, and unknown entitlements are fail-closed by the gate implementation and covered by existing tests. A valid disposable entitlement was not created for this CV; valid paid pipeline execution is **NOT ESTABLISHED**. No direct adapter invocation or flag/environment bypass was used.

## Evidence classification

- E1: local CLI, runtime HTTP, workspace, pipeline denial, and runtime evidence collection.
- E2: source inspection of pipeline gate, runtime routes, workspace manager, and package configuration.
- E3: local/disposable repository context; no production infrastructure.
- E4: client 71/71 and server 651/651 repository tests.
- E5: none performed during CV-80.

## Final decision

CV-80 COMPLETE

minitok-native EXECUTION: PARTIAL
minitok WORKSPACE: PASS
minitok PIPELINE: PARTIAL
LOCAL CLIENT: PASS
LOCAL SERVER: PASS
LOCAL DATABASE: PASS (E4/E3 baseline; fresh live DB not rerun in CV-80)
DODO CHECKOUT: PASS (inherited CV-79 E1; not rerun)
DODO WEBHOOK: PASS (inherited CV-79 E1; not rerun)
ACTIVATION: PASS (inherited CV-79 E1/E4)
ENTITLEMENT: PASS (inherited CV-79 E1/E4)
CLIENT ONLINE VALIDATION: PASS (inherited CV-79 E1)
PAID PIPELINE EXECUTION: NOT ESTABLISHED
SECURITY NEGATIVE MATRIX: PASS (E4; live CV-79 baseline inherited)
IDOR: PASS (E4)
ENTITLEMENT FORGERY: PASS (E4)
REPLAY/IDEMPOTENCY: PASS (E4; live CV-79 baseline inherited)
STRIPE ACTIVE SURFACE: 0
DODO-ONLY: PASS
PACKAGE: PASS
DOCUMENTATION PARITY: PARTIAL
RUNTIME/TEST PARITY: PARTIAL
minitok EVIDENCE: PARTIAL
LOCAL IMPLEMENTATION READY: YES for exercised local surfaces
IMMUTABLE RELEASE READY: NO
PRODUCTION READY: NO

## Blockers

### P2 — Paid pipeline execution not established

- ROOT CAUSE: pipeline requires a valid online entitlement before provider work; no disposable valid entitlement/provider adapter was available without using paid/external credentials.
- EVIDENCE: E1 fail-closed `LEGACY_UNBOUND`; E2 `src/pipeline/loop.js:121-145`.
- IMPACT: complete minitok-native commercial authorization-to-execution chain remains unproven.
- RECOMMENDED NEXT ACTION: provide an explicitly supported local entitlement fixture and deterministic mock adapter path, without weakening production authorization.

### P2 — Immutable provenance unavailable

- ROOT CAUSE: pre-existing dirty server worktree and malformed client `.git/packed-refs`.
- EVIDENCE: baseline `git status`; client status failed with malformed packed-refs.
- IMPACT: immutable release readiness cannot be established.
- RECOMMENDED NEXT ACTION: repair Git metadata under a separately approved maintenance task; do not revert existing changes.

### P3 — Documentation parity partial

- ROOT CAUSE: server README still contains historical unchecked feature markers while source/tests show implemented Dodo, activation, entitlement, and JWT surfaces.
- EVIDENCE: README/source comparison.
- IMPACT: documentation does not fully represent current runtime behavior.
- RECOMMENDED NEXT ACTION: reconcile README against source and current route/test evidence.

## Prohibited-operation audit

PRODUCTION OPERATIONS: NONE
PRODUCTION DB ACCESS: NONE
PRODUCTION CREDENTIAL ACCESS: NONE
PRODUCTION SIGNING KEY ACCESS: NONE
REAL PAYMENT: NONE
REAL CUSTOMER CREATION: NONE
REAL SUBSCRIPTION CREATION: NONE
REAL WEBHOOK DELIVERY: NONE
GIT MUTATIONS: NONE
PUBLISH: NONE
DEPLOYMENT: NONE
PRIVATE KEY OUTPUT: NONE
