# CV-81 minitok-native Paid Pipeline Report

## Scope

CV-81 used installed `minitok 1.3.0`, a disposable local PostgreSQL/Node stack, an ephemeral Ed25519 identity, a local Dodo HTTP mock, and a deterministic OpenAI-compatible provider mock. No production endpoint, database, credential, payment, webhook, signing key, publish, deployment, or Git mutation was used.

## Direct evidence

- `minitok --version` → `1.3.0`.
- `minitok doctor`, `status`, `workspace list`, and command help completed.
- Disposable Compose project `minitok-cv81` started on `127.0.0.1`; server `/health` returned 200.
- Fresh PostgreSQL applied migrations `0000` through `0009`; the requested `0000`→`0009` chain completed. `customers`, `plans`, `subscriptions`, `billing_events`, `activation_keys`, `installations`, and `entitlement_records` were present in the schema.
- Local Dodo checkout HTTP returned 200 with `session_id` and localhost `checkout_url`.
- Signed local `payment.succeeded` and `subscription.active` webhook deliveries returned 200 and were recorded as processed. Repeated delivery behavior is covered by server tests, but was not repeated in the final disposable run.
- A disposable activation key was retrieved over local HTTP with 200.
- The isolated CLI activated against the local server and reported `Entitlement: ALLOWED`; the server URL was localhost and the key ID was `key-cv81-local`.
- A disposable workspace was registered and the real installed CLI executed `minitok run 'Return exactly: CV-81-PASS' --repo ... --provider-override cv81mock --dry-run`.
- Pipeline result: one cycle, provider mock requests completed, verifier returned `APPROVE` confidence `1`, process exit `0`, and `.minitok/last-run.json` recorded `success: true`.

## Important limitation

The direct native run is proven through entitlement gate, provider creation, provider execution, pipeline loop, and result. The runtime start command did not complete within the verification timeout, so the runtime HTTP evidence/audit subsystem was not independently collected for this run. The final HTTP chain was also not completed through activation and `/v1/validate` in the same final customer record before teardown. Therefore the strict CV-81 all-gates PASS claim is not established.

## Evidence classification

- E1 LIVE: installed CLI, disposable server, fresh database, Dodo mock checkout/webhooks, activation key retrieval, isolated activation, native `minitok run`, native result.
- E2 SOURCE: pipeline gate before provider creation (`src/pipeline/loop.js:121-145`), online validation (`src/entitlement/online.js:52-73`), provider creation (`src/llm/provider.js:269-282`).
- E3 TEST: client 71/71; server 651/651.
- E4 INHERITED: prior CV-79 commercial evidence only; not promoted to CV-81 LIVE.

## Result

`minitok-native PAID PIPELINE EXECUTION: NOT ESTABLISHED` under the supplied strict criteria, because final runtime evidence/audit and a single-record activation → validation closure were incomplete.

Production operations: NONE
Git mutations: NONE
Private production key access: NONE
Private disposable key remaining after teardown: NONE
