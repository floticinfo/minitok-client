# CV-77 minitok-native Local Verification Report

## Scope
Local-only verification of `@flotic/minitok@1.3.0` using the installed CLI/runtime. No production systems, credentials, payment, deployment, registry, publish, Git mutation, or private production key access occurred.

## Bootstrap evidence
| Command | Result | Evidence |
|---|---|---|
| `node bin/minitok.js --version` | PASS | `minitok 1.3.0` |
| `node bin/minitok.js --help` | PASS | Native status, doctor, runtime, checkout, portal, activation, workspace, and workflow commands listed |
| `node bin/minitok.js doctor` | PARTIAL | Node/npm/git and local config passed; configured Claude role adapters unavailable |
| `node bin/minitok.js status` | PASS/SAFE NEGATIVE | `LEGACY_UNBOUND`, no workspace, default server remained production URL but was not contacted |
| `node bin/minitok.js runtime start --port 4578` | PASS | Native runtime process started on `127.0.0.1:4578` |
| `node bin/minitok.js runtime status` | PASS | Runtime reported running |
| `GET /health` | PASS | HTTP 200, `{"status":"ok"}` |
| `GET /api/v1/status` | PASS/SAFE NEGATIVE | HTTP 200, entitlement invalid/legacy-unbound and knowledge count observed |

## Native runtime result
The local runtime operated successfully and correctly remained fail-closed without a usable entitlement. No paid execution was granted by the unactivated state. Native `status`, `doctor`, and runtime status were used; no production URL was contacted.

## Disposable signing round trip
A disposable Ed25519 keypair was generated in memory by the repository-supported crypto mechanism. Identity: `key-cv77-local`. Public-key fingerprint: `72a8c73bd18ccc6cac20ee460b8852a4854654deedbace772f3236b399a40d17`. Private key contents were not recorded.

The server signer produced an entitlement, the client-compatible verifier accepted it, and a modified payload was rejected. Results: server sign PASS, client verify PASS, tamper rejection PASS. The production registry entry `key-2024-01-prod` was not modified.

## Client verification evidence
- Missing/legacy entitlement: paid execution blocked.
- Valid disposable signed entitlement: client-compatible verification PASS.
- Tampered entitlement: rejected as invalid signature.
- Wrong key identity: rejected by unknown/untrusted key behavior.
- Expired entitlement, wrong installation, and invalid online response: covered by the client gate/online tests and fail closed.

## Package evidence
`npm pack --dry-run --json` reported `@flotic/minitok@1.3.0`, 71 files. CLI, runtime, configuration, entitlement, and pipeline modules were present. No `.env`, test files, reports, generated evidence, PEM/private key, or private production key entered the package.

## Tests
- Client `npm test`: PASS, 71 passed, 0 failed.
- Client `npm run lint`: PASS.
- These are supporting test results and are not treated as proof of live paid execution.

## Documentation parity
README documents Dodo-based purchase, activation-key retrieval, activation, entitlement status, and runtime commands. It still describes the default production server URL and production purchase flow; it does not describe the disposable CV-77 fixture, which is correctly classified as CV evidence rather than a product-documentation contract. No documentation rewrite was performed.

## Final decision

CV-77 COMPLETE

minitok-native EXECUTION: PASS
LOCAL CLIENT: PASS
LOCAL SERVER: PASS
LOCAL DATABASE: PASS
LOCAL SIGNING: PASS
DODO POSITIVE FLOW: PASS
ENTITLEMENT POSITIVE FLOW: PASS
CLIENT↔SERVER INTEGRATION: FAIL
STRIPE ACTIVE SURFACE: 0 / FAIL
DODO-ONLY: PASS
PACKAGE: PASS
DOCUMENTATION PARITY: PASS
RUNTIME/TEST PARITY: FAIL

LOCAL IMPLEMENTATION READY: NO
IMMUTABLE RELEASE READY: NO
PRODUCTION READY: NO

P1 BLOCKERS:
- None introduced or repaired. Production signing identity remained untouched.

P2 BLOCKERS:
- Canonical Compose server was not configured with a mounted disposable signing fixture, so a live HTTP activation/validation positive chain was not executed. Repository-provided mocked lifecycle passed.
- Native doctor reports unavailable Claude role adapters.
- Existing dirty worktrees prevent immutable release provenance.

P3 BLOCKERS:
- Product README does not document CV-local mock infrastructure; this is not silently changed.

LOCAL REPAIRS PERFORMED:
- None to product source or production configuration.
- Generated disposable signing material in memory only for verification.

PRODUCTION OPERATIONS:
NONE

GIT MUTATIONS:
NONE

PRIVATE PRODUCTION KEY ACCESS:
NONE

REPORTS:
- `minitok-client-release/docs/CV-77_minitok_NATIVE_LOCAL_VERIFICATION_REPORT.md`
- `minitok-server-deploy/docs/CV-77_minitok_NATIVE_LOCAL_INTEGRATION_REPORT.md`
- `minitok-server-deploy/docs/CV-77_LOCAL_POSITIVE_FLOW_MATRIX.md`
