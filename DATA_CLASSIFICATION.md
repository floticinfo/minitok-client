# minitok Data Classification

> **Document type:** Technical data-processing boundary definition
> **Version:** 1.0.0
> **Last updated:** 2026-08-28
> **Applies to:** `@flotic/minitok` client v1.3.0+ and `minitok-server`

---

## 1. Classification Categories

| Class | Label | Description | Server Transfer |
|-------|-------|-------------|-----------------|
| D0 | PUBLIC | Non-sensitive operational data | Allowed |
| D1 | LICENSE | Entitlement/licensing lifecycle data | Required for service operation |
| D2 | BILLING | Subscription/payment data | Required for service operation |
| D3 | TELEMETRY | Sanitized aggregate usage metrics | Conditional (opt-in + entitlement + plan feature) |
| D4 | LOCAL_ONLY | User content — never leaves the machine | **FORBIDDEN** |
| D5 | SECRET | Cryptographic secrets, API keys, tokens | **FORBIDDEN to minitok server** |
---

## 2. Detailed Classification

### D4 — LOCAL_ONLY (Never transmitted to minitok server)

| Data Item | Source | Storage | Notes |
|-----------|--------|---------|-------|
| User prompt / task instruction | CLI argument `minitok run "..."` | Local memory, `last-run.json` | Only sent to LLM provider |
| Source code | Repository files | Local filesystem | Only sent to LLM provider as context |
| File contents | Read during pipeline | Local filesystem | Only sent to LLM provider |
| Command output | Executed during verification | Local memory | Never transmitted |
| Terminal output | stdout/stderr | Local memory | Never transmitted |
| Generated code | LLM response → applied | Local filesystem | Never transmitted |
| Generated text | LLM response | Local memory | Never transmitted |
| Knowledge entries | KnowledgeStore | `~/.minitok/evolution/outcomes.json` | Never transmitted to minitok server |
| Goal | Pipeline execution | `outcomes.json` | **Stripped by sanitizer before any upload** |
| Summary | Pipeline execution | `outcomes.json` | **Stripped by sanitizer before any upload** |
| Decision trace | Pipeline cycles | Local memory | Never transmitted |
| Agent reasoning/context | LLM interaction | Local memory | Never transmitted |
| Repository metadata (name, path) | Workspace config | Local config | Never transmitted |
| LLM request/response content | Provider interaction | Local memory | Never transmitted |
| Error messages containing paths | Pipeline errors | Local memory | Never transmitted |

### D3 — TELEMETRY (Conditional upload)

| Data Item | Type | Range | Description |
|-----------|------|-------|-------------|
| `status` | enum | `success`, `failure`, `partial` | Outcome status |
| `cycles` | integer | 0–100 | Pipeline cycles taken |
| `duration_ms` | integer | 0–3,600,000 | Wall-clock execution time |
| `files_changed` | integer | 0–1000 | Files modified during run |
| `total_tokens` | integer (optional) | 0–10,000,000 | Total tokens consumed |
| `failure_category` | enum (optional) | `lint`, `test`, `validation`, `timeout`, `api_error`, `unknown` | Failure classification |

**Upload requirements (all must be true):**
1. Valid entitlement (cryptographically verified)
2. `evolution_upload` feature in entitlement
3. User explicit opt-in (`minitok evolution enable`)
4. Sanitizer allowlist pass
5. Valid server URL and installation token
6. Server-side subscription + feature validation

### D1 — LICENSE (Server-transmitted for service operation)

| Data Item | Example | Transmitted To |
|-----------|---------|----------------|
| `entitlement_id` | UUID | minitok server |
| `installation_id` | UUID | minitok server (activation) |
| `plan_id` | `"pro"` | minitok server |
| `features` | `["evolution_upload"]` | minitok server (in signed payload) |
| `max_devices` | `3` | minitok server |
| `issued_at` | ISO 8601 | minitok server |
| `expires_at` | ISO 8601 | minitok server |
| `key_id` | `"key-2024-01-prod"` | minitok server |

### D2 — BILLING (Server-transmitted)

| Data Item | Transmitted To |
|-----------|----------------|
| `customer_id` | minitok server |
| `subscription_id` | minitok server |
| `subscription status` | minitok server |
| Payment event IDs | minitok server + Dodo |
| Webhook event IDs | minitok server |

### D5 — SECRET (Never transmitted to minitok server)

| Data Item | Storage | Transmitted To |
|-----------|---------|----------------|
| LLM API keys (Anthropic, OpenAI, Google, OpenRouter) | `~/.minitok/tokens/` | LLM provider **only** |
| OAuth tokens | `~/.minitok/tokens/` | LLM provider **only** |
| Installation JWT | `~/.minitok/entitlement/` | minitok server (Bearer auth only) |
| Ed25519 signing private key | Server only | **Never leaves server** |
| JWT secret | Server env | **Never leaves server** |
| Dodo API key | Server env | Dodo API **only** |
| Dodo API key | Server env | Dodo API **only** |
| npm token | Local CI | npm registry **only** |
---

## 3. Data Flow Diagram

```
USER MACHINE (client)
├── D4 LOCAL_ONLY
│   ├── Prompt/Source/Knowledge → LLM Provider (NOT to minitok server)
│   ├── Generated content → Local filesystem
│   └── Agent context/decisions → Local memory
│
├── D3 TELEMETRY (CONDITIONAL upload)
│   └── 6-step gate:
│       1. Entitlement valid?
│       2. Feature "evolution_upload" present?
│       3. User opt-in enabled?
│       4. Sanitizer allowlist pass?
│       5. Server URL + token configured?
│       6. Network request → minitok server
│
├── D1 LICENSE (activation)
│   └── POST /v1/activate → minitok server
│
└── D5 SECRET
    └── API keys → LLM Provider (NOT to minitok server)

minitok SERVER
├── Receives: D1 (license), D2 (billing), D3 (telemetry)
├── NEVER accepts: D4 (user content), D5 (secrets)
└── Server-side validation: JWT → customer → subscription → plan → features → store
```

---

## 4. Privacy Consent vs Entitlement

```
ENTITLEMENT AXIS                    PRIVACY CONSENT AXIS
├── Controls: feature access        ├── Controls: data transmission
├── Source: subscription/purchase   ├── Source: user explicit opt-in
├── Validated: cryptographic        ├── Validated: local file state
└── Scoped: per-installation        └── Scoped: per-user preference

ENTITLEMENT DOES NOT IMPLY CONSENT
Consent does not override LOCAL_ONLY classification
```

---

## 5. Fail-Closed Principle

For ALL data classification decisions:

| Condition | Behavior |
|-----------|----------|
| Classification unknown | Treat as LOCAL_ONLY — do not transmit |
| Consent state unknown | Treat as OFF — do not transmit |
| Entitlement state unknown | Treat as BLOCKED — do not transmit |
| Sanitizer validation fails | REJECT — do not transmit |
| Server validation fails | REJECT — do not store |
| Credentials missing | BLOCK — do not transmit |

---

## 6. Future Considerations

- **Cloud knowledge sync:** D4 data would require its own classification review, explicit opt-in, and separate consent. D4 classification prevents automatic sync.
- **Enterprise/Team plans:** Centralized policy administration must respect data classification boundaries. Plan-level policy cannot override LOCAL_ONLY classification.
- **Diagnostic/debug data:** Must pass through the same classification gate. Debug mode does not bypass classification.
