# minitok Privacy & Entitlement Policy

> **Document type:** Technical policy — data processing, consent, and entitlement architecture
> **Version:** 1.0.0
> **Last updated:** 2026-08-28
> **Applies to:** `@flotic/minitok` v1.3.0+

---

## 1. Scope

This document defines the technical privacy and entitlement policies enforced by the minitok client and server. It covers:

- What data minitok processes
- What data is transmitted to minitok servers
- What data stays local
- How consent is managed
- How entitlement relates to (and differs from) privacy consent
- What enforcement mechanisms exist

---

## 2. Core Principles

### 2.1 Privacy by Default

All telemetry and analytics features are **OFF by default**. Users must explicitly opt in.

### 2.2 Fail-Closed

If any privacy or entitlement state cannot be determined, the system **denies** the operation. No data is transmitted when the policy state is unknown.

### 2.3 Data Minimization

Only data explicitly required for service operation is transmitted to minitok servers. All user content stays local.

### 2.4 Entitlement ≠ Privacy Consent

Having a valid subscription (entitlement) does **not** imply consent to data transmission. These are separate axes:

- **Entitlement** controls feature access
- **Privacy consent** controls whether data is actually transmitted

Both must be satisfied for telemetry upload.
## 3. Data Classification Summary

| Classification | Description | Server Transfer |
|----------------|-------------|-----------------|
| LOCAL_ONLY | User content (prompts, code, knowledge, etc.) | **NEVER** |
| TELEMETRY | Sanitized aggregate usage metrics | Only with **entitlement + feature + opt-in** |
| LICENSE | Entitlement lifecycle data | Required for activation |
| BILLING | Subscription/payment data | Required for service operation |
| SECRET | API keys, signing keys, tokens | **NEVER to minitok server** |

See [DATA_CLASSIFICATION.md](./DATA_CLASSIFICATION.md) for the full matrix.

---

## 4. Privacy Consent Model

### 4.1 Consent States

| State | Meaning | Behavior |
|-------|---------|----------|
| UNKNOWN | Consent not yet established | **Fail-closed: treat as OFF** |
| OFF | Explicitly disabled (default) | No telemetry transmitted |
| ON | Explicitly enabled | Telemetry may be transmitted (subject to other gates) |

### 4.2 Consent Storage

Consent is stored in `~/.minitok/evolution/optin.json` with owner-only file permissions.

### 4.3 Consent Management

Users manage consent via CLI:

```bash
minitok evolution status   # View current consent state
minitok evolution enable   # Enable telemetry (opt-in)
---

## 5. Entitlement Model

### 5.1 Plan Tiers

| Plan | Description | Features |
|------|-------------|----------|
| FREE | Local execution only | Basic CLI, local knowledge, no telemetry |
| PRO | Commercial license | Full CLI, entitlement, evolution upload (with consent) |
| *Future: ENTERPRISE/TEAM* | Organizational management | Centralized administration, policy-controlled telemetry |

### 5.2 Feature Flags

Features are included in the signed entitlement payload:

- `basic_features` — core CLI functionality
- `evolution_upload` — telemetry upload capability (still requires user consent)

### 5.3 Entitlement Verification Chain

```
Entitlement artifact (signed Ed25519)
  → Cryptographically verify signature
  → Check expiration
  → Verify installation binding
  → Check features for requested capability
  → Check privacy consent
  → Execute operation
```
minitok evolution disable  # Disable telemetry (opt-out)
---

## 6. Upload Gate Chain

For telemetry upload, ALL of these conditions must be met:

```
1. Entitlement valid?        → Gate check
2. Feature present?          → evolution_upload in features[]
3. User opt-in?              → optin.json enabled
4. Sanitizer pass?           → Only ALLOWED_FIELDS
5. Server URL configured?    → resolveServerUrl() non-null
6. Installation token set?   → installation-token.json
7. Server validates token?   → JWT → customer → subscription → plan → features
8. Server validates schema?  → Only ALLOWED_BODY_FIELDS
9. Database insert?          → evolution_telemetry table
```

If ANY step fails → **NO DATA TRANSMITTED**.

---

## 7. What NEVER Leaves the Machine

The following data is **never** transmitted to minitok servers:

- User prompts and task descriptions
- Source code from repositories
- File contents
- Command output and terminal output
- LLM-generated code and text
- Knowledge entries and embeddings
- Task goals and summaries
- Agent reasoning traces and decision records
- Repository names, paths, and metadata
- LLM request/response content
- Error messages containing file paths or content
- API keys and credentials

This is enforced by:
1. The upload sanitizer (strict allowlist)
2. The upload gate (multiple independent checks)
---

## 8. Enforcement Architecture

### Client-Side

| Layer | Module | Enforcement |
|-------|--------|-------------|
| Entitlement Gate | `entitlement/gate.js` | Ed25519 signature, expiration, installation binding, clock rollback |
| Feature Check | `evolution/upload.js` | `evolution_upload` in entitlement features |
| Privacy Consent | `evolution/optin.js` | Local opt-in file, default OFF |
| Sanitizer | `evolution/sanitize.js` | Strict allowlist, unknown field rejection |
| Network | `evolution/upload.js` | HTTPS POST only after all checks pass |

### Server-Side

| Layer | Module | Enforcement |
|-------|--------|-------------|
| Auth | `middleware/auth.js` | Bearer JWT verification, customer identity extraction |
| Subscription | `services/evolution-telemetry.js` | Server-side subscription lookup |
| Schema | `api/evolution-telemetry.js` | Fastify schema + explicit unknown field rejection |
| DB Schema | `db/schema/index.js` | Only telemetry columns, no content storage |
| Rate Limiting | `app.js` | In-memory rate limiting per IP |

---

## 9. User Controls

| Command | Action |
|---------|--------|
| `minitok evolution status` | View current privacy consent state |
| `minitok evolution enable` | Enable telemetry (opt-in) |
| `minitok evolution disable` | Disable telemetry (opt-out) |
| `minitok status` | View entitlement and feature status |
| `minitok doctor` | Check environment and configuration |

---

## 10. Future Considerations

### Cloud Knowledge Sync
Would require new classification, separate consent, independent feature flag, and new upload boundary.

### Enterprise/Team Plans
Organization-level policy must not override LOCAL_ONLY classification.

### Diagnostic Data
Must pass through the same classification gate, never include user content, and have explicit opt-in. Debug flags must never bypass privacy gates.
3. The server schema (only known fields accepted)
```

### 4.4 Consent Independence

Consent is independent of entitlement:
- Pro subscription + consent=OFF → no telemetry
- consent=ON + Free plan → no telemetry (feature not available)
- consent=ON + expired subscription → no telemetry

### 2.5 Defense in Depth

Multiple independent layers enforce the privacy boundary (see Section 9).
