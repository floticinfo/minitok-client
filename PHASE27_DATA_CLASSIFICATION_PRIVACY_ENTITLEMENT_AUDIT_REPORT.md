# PHASE 27 — Data Classification + Privacy Boundary + Plan Entitlement Matrix & Enforcement

## Final Audit Report

**Date:** 2026-08-28
**Auditor:** Cline (Senior Security Engineer / Privacy Architect)
**Scope:** `@flotic/minitok` v1.3.0 client + `minitok-server` v0.1.0
**Verdict:** **PASS** ✓

---

## Executive Summary

Phase 27 conducted a comprehensive audit of minitok's data classification, privacy boundary, plan entitlement matrix, and enforcement architecture. The audit verified that:

1. **User content (prompts, source code, knowledge) NEVER leaves the machine** — enforced by strict allowlist sanitizer, multi-gate upload chain, and server-side schema validation.
2. **Entitlement and privacy consent are fully separated** — Pro subscription does NOT imply telemetry consent.
3. **Telemetry is OFF by default** — fail-closed principle. Unknown consent state = no transmission.
4. **No debug or environment variable bypasses exist** — privacy gates cannot be circumvented.
5. **Server-side validation provides defense-in-depth** — Fastify schema + explicit rejection + subscription verification.
6. **Version consistency confirmed** — `package.json` = `1.3.0`, `src/core/version.js` = `1.3.0`.

### PHASE 26 Findings Resolution

| Finding | Status |
|---------|--------|
| P2-01: Policy documentation | ✅ **RESOLVED** — DATA_CLASSIFICATION.md + POLICY.md |
| P2-02: KnowledgeStore content | ✅ **DOCUMENTED** — Local-only; blocked by sanitizer |
| P2-03: Version inconsistency | ✅ **RESOLVED** — Both at 1.3.0 |
| P3 findings | ✅ **ALL CONFIRMED** |
---

## Authority Verification

### Client

| Item | Value |
|------|-------|
| Repository | `https://github.com/floticinfo/minitok-client` |
| Authoritative Source | `C:\Users\J1\minitok-client-release` |
| Branch | `master` (up to date with `origin/master`) |
| HEAD | `c37927d` |
| Version | `1.3.0` (consistent) |
| Working Tree | clean (4 untracked files) |

### Server

| Item | Value |
|------|-------|
| Repository | `https://github.com/floticinfo/minitok-server` |
| Authoritative Source | `C:\Users\J1\minitok-server-deploy` |
| Branch | `master` |
| Version | `0.1.0` |
| Working Tree | clean |

---

## Data Classification Matrix

| Class | Label | Description | Server Transfer |
|-------|-------|-------------|-----------------|
| D0 | PUBLIC | Operational data | Allowed |
| D1 | LICENSE | Entitlement lifecycle | Required |
| D2 | BILLING | Subscription/payment | Required |
| D3 | TELEMETRY | Aggregate metrics | Conditional |
| D4 | LOCAL_ONLY | User content | **FORBIDDEN** |
| D5 | SECRET | API keys, tokens | **FORBIDDEN to minitok** |

### D4 LOCAL_ONLY
Prompts, source code, file contents, command output, generated content, knowledge, goals, summaries, decision traces, agent context, repo metadata, error messages, API keys (→LLM only).

### D3 TELEMETRY (6 fields)
`status`, `cycles`, `duration_ms`, `files_changed`, `total_tokens`, `failure_category`.
---

## Privacy Boundary

### Upload Gate Chain
```
entitlement → feature → opt-in → sanitize → credentials → network
```
1. **Entitlement Gate**: Ed25519 signature, expiration, installation binding, clock rollback
2. **Feature Check**: `evolution_upload` must be in features
3. **Privacy Consent**: Explicit opt-in, default OFF, fail-closed
4. **Sanitizer**: Strict allowlist — only 6 fields
5. **Credentials**: Server URL + installation token
6. **Network**: HTTPS POST to `/v1/evolution/telemetry`

### Server-side Validation
Fastify schema, explicit unknown-field rejection, JWT→customer→subscription→plan→features

---

## Consent vs Entitlement Separation

| Plan | Consent | Attempt | Verdict |
|------|---------|---------|---------|
| FREE | OFF | telemetry | **BLOCK** |
| FREE | ON | telemetry | **BLOCK** |
| PRO | OFF | telemetry | **BLOCK** |
| PRO | ON | telemetry | **ALLOW** |
| PRO | ON | prompt | **BLOCK** |
| Invalid | any | telemetry | **BLOCK** |

---

## Plan Entitlement Matrix

| Capability | FREE | PRO | FUTURE |
|-----------|:----:|:---:|:------:|
| Local execution | YES | YES | YES |
| Local knowledge | YES | YES | YES |
| Prompt upload | NO | NO | NO |
| Source code upload | NO | NO | NO |
| Knowledge upload | NO | NO | Conditional |
| Entitlement | LIMITED | YES | YES |
---

## Upload Boundary Inventory

| Call Site | Endpoint | Data | Gate |
|-----------|----------|------|------|
| `evolution/upload.js` | `POST /v1/evolution/telemetry` | Telemetry (D3) | 6-step gate |
| `cli/commands/activate.js` | `POST /v1/activate` | License key (D1) | Server auth |
| `cli/commands/activation-key.js` | `POST /v1/activation-key` | JWT (D1) | Server auth |
| `cli/commands/checkout.js` | `POST /v1/checkout` | Plan ID (D2) | Server auth |
| `cli/commands/portal.js` | `POST /v1/portal` | JWT (D2) | Server auth |
| `llm/provider.js` | LLM API endpoints | Prompt (D4) | **→LLM, NOT minitok** |

All verified: NO user content goes to minitok server via any path.

---

## Client Enforcement

### New: `PrivacyConsent` (`src/evolution/privacy.js`)
Formal abstraction separating consent from entitlement:
- `isTelemetryConsented()` — true only when explicitly enabled
- `status()` — returns `{ consented, state, detail }`
- `grant()` / `revoke()` — enable/disable
- `static evaluateTelemetryPolicy()` — checks entitlement + feature + consent

### Enforcement Layers
1. `entitlement/gate.js` — Cryptographic | 2. `evolution/upload.js` — Multi-gate
3. `evolution/optin.js` — Persistence | 4. `evolution/privacy.js` — Abstraction (NEW)
5. `evolution/sanitize.js` — Allowlist | 6. `entitlement/verify.js` — Ed25519
---

## Tests

| Suite | Tests | Status |
|-------|-------|--------|
| P1–P10 Privacy Enforcement | 10 | ✅ ALL PASS |
| E1–E7 Entitlement/Consent | 7 | ✅ ALL PASS |
| X1–X6 Cross-Plan Matrix | 6 | ✅ ALL PASS |
| S1–S7 Server Contract | 7 | ✅ ALL PASS |
| Existing client tests | 219 | ✅ ALL PASS |
| Server test suite | 683 | ✅ ALL PASS |
| **TOTAL** | **932** | **ALL PASS** |

---

## Attack Scenarios

| Scenario | Verdict |
|----------|---------|
| Prompt exfiltration via telemetry | **BLOCKED** |
| Source code exfiltration | **BLOCKED** |
| Knowledge exfiltration | **BLOCKED** |
| Secret exfiltration | **BLOCKED** |
| Plan bypass (PRO without consent) | **BLOCKED** |
| Feature bypass | **BLOCKED** |
| Payload smuggling | **BLOCKED** (client + server) |
| Debug bypass | **BLOCKED** (no debug flag) |
| Env var bypass | **BLOCKED** (no env read in gate) |

---

## Remaining Risks

| Risk | Sev | Description |
|------|-----|-------------|
| KnowledgeStore contains goal/summary | P2 | Local file only; blocked by sanitizer |
| File permission best-effort on Windows | P3 | `chmod` advisory on Windows |
| Future cloud sync feature | P3 | Would need new classification + consent |

---

## Final Verdict: **PASS** ✓

| Condition | Status |
|-----------|--------|
| User content → server? | **NO** ✅ |
| Source code → server? | **NO** ✅ |
| Knowledge → server? | **NO** ✅ |
| Entitlement ≠ consent? | **YES** ✅ |
| Telemetry OFF by default? | **YES** ✅ |
| Privacy unknown → fail-closed? | **YES** ✅ |
| Client allowlist? | **YES** ✅ (6 fields) |
| Server validation? | **YES** ✅ |
| Debug bypass? | **NONE** ✅ |
| Credential leakage? | **NONE** ✅ |
| All tests pass? | **932/932** ✅ |
| Documentation? | **COMPLETE** ✅ |
| Version consistent? | **YES** (1.3.0) ✅ |
7. `cli/commands/evolution.js` — User CLI

### Server Enforcement Layers
1. `middleware/auth.js` — JWT | 2. `api/evolution-telemetry.js` — Schema
3. `services/evolution-telemetry.js` — Subscription | 4. `db/schema/` — No content columns

---

## Security Findings

| Check | Result |
|-------|--------|
| New security issues | ✅ **NONE** |
| PHASE 26 P2 findings | ✅ **ALL RESOLVED** |
| API keys in source | ✅ **NONE** |
| JWT secrets in source | ✅ **NONE** |
| Private keys in source | ✅ **NONE** |
| `.env` committed | ✅ **NO** |
| Test fixtures with credentials | ✅ **ALL MOCK/SANITIZED** |
| Subscription | NO | YES | YES |
| Telemetry | OFF | OFF/OFF | Controlled |
