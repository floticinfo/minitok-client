# CV-76 Local Runtime Verification Report

## Scope
Actual local execution of `@flotic/minitok@1.3.0` from `C:\Users\J1\minitok-client-release`, including CLI, local runtime, entitlement behavior, client artifact, and client/server signing identity comparison. Production systems and credentials were not accessed.

## Environment
- Node: `v24.15.0`; npm: `11.12.1`; Docker: `29.6.2`; Compose: `v5.3.1`
- Client source: `C:\Users\J1\minitok-client-release`; package version `1.3.0`
- Local runtime entrypoint: `node bin/minitok.js runtime start --port 4578`
- Server endpoint used for integration checks: `http://127.0.0.1:3000`
- Secret values were not printed. Client provider configuration was present; server `.env` and runtime credential variables were absent in the host shell.

## Actual commands and observations
- `node bin/minitok.js --version`: `minitok 1.3.0`.
- `node bin/minitok.js --help`: CLI help listed status, doctor, runtime, checkout, portal, activation, and related commands.
- `node bin/minitok.js doctor`: Node/npm/git passed; all four provider variables were configured; configured Claude roles were unavailable.
- `node bin/minitok.js status`: runtime reported `LEGACY_UNBOUND`; no workspace was set.
- `node bin/minitok.js runtime start --port 4578`: started successfully.
- `GET http://127.0.0.1:4578/health`: `200`, JSON status `ok`.
- Runtime `/`, `/version`, and `/entitlement`: `404`, matching the implemented route surface; `/api/v1/status` is the documented status route.
- Client checkout, portal, and activation-key commands without a token rejected the request with the documented authentication error. No real payment, customer, subscription, webhook, or activation was performed.

## Entitlement and security runtime
The local runtime status showed no usable paid entitlement. This allowed safe negative-path verification only: missing entitlement/credentials did not grant paid execution. The configured source/test suite separately reports signed-entitlement, expiration, tampering, installation binding, and offline/online gate cases as passing; those are test evidence, not a substitute for a successful paid local flow.

## Client ↔ server integration
Blocked for a positive flow because the disposable server had no Dodo credentials, signing configuration, customer, or activation key. Negative requests rejected missing authentication. Therefore no end-to-end paid client-to-server-to-database entitlement flow is claimed.

## Artifact evidence
`npm pack --dry-run --json` for `@flotic/minitok@1.3.0` reported 71 files and included CLI, runtime, configuration, entitlement, and pipeline production files. No PEM/private key, `.env`, test file, report, or generated evidence file was included. The package excludes `src/**/*.test.js`; the listed `audit`/`evidence` paths are production modules, not audit reports.

## Signing identity
The client contains key ID `key-2024-01-prod`, but its embedded public key did not match the local server `keys/public-key.pem` (SHA-256 comparison: server `11d7b612e4a14d87999fa154346a28b87dd4adbb340ca52d7dc5c7951d3df85a`; client `fd827bb7b72d92f89305d7a8f3a4fa6d428bd7472c03397f8837ca3b4d9c97f3`). Private key material was not read or output.

## Test/runtime comparison
- Client `npm run lint`: PASS.
- Client configured `npm test`: 71 passed, 0 failed.
- Runtime: CLI and health PASS; paid entitlement flow NOT AVAILABLE; signing identity FAIL.
- The configured client test glob does not cover the repository's separate `tests/` directory; no claim is made that all client tests ran.

## Failures and blockers
1. **P1 security/release blocker:** local server public signing key does not match the client's trusted public key for the same key ID.
2. **P2 release quality:** no local Dodo credentials/mock wiring was available, so checkout/portal/webhook positive runtime behavior was not exercised.
3. **P2 integration:** no disposable customer/subscription/activation fixture was available for a positive client-server entitlement flow.
4. CLI doctor reports configured providers but all configured Claude role adapters unavailable.

## Production evidence boundary
Local CLI/runtime/package evidence only. Production DB, production signer, production image, production provenance, and public parity were not verified.

## Prohibited-operation audit
NONE PERFORMED. No commit, tag, push, publish, deployment, production mutation, real payment, customer/subscription creation, webhook delivery, or private-key access was performed.

## Final decision
- LOCAL CLIENT: FAIL for release closure because local signing identity mismatches.
- LOCAL IMPLEMENTATION READY: NO.
- IMMUTABLE RELEASE READY: NO.
- PRODUCTION READY: NO.

## Exact next actions
1. Reconcile the local server public key and client trusted key under a new approved local fixture; rerun a signed local round trip without touching production keys.
2. Provide a disposable Dodo mock/test configuration and seeded local fixtures; execute checkout, portal, webhook, activation, entitlement, and client integration paths.
3. Re-run package and runtime verification after reconciliation; keep production readiness separate until production evidence is supplied.
