# minitok Privacy & Entitlement Policy

> **Document type:** Technical policy — data processing, consent, and entitlement architecture
> **Version:** 1.1.0
> **Last updated:** 2026-09-04
> **Applies to:** `@flotic/minitok` v1.3.4 and compatible `minitok-server` v0.1.0 API

This is a technical description of current implementation behavior. It is not a privacy notice, data-processing agreement, or legal advice. Legal review is required before publication as a legal policy.

## 1. Scope

This document describes data processed by the client and server, client privacy controls, entitlement checks, telemetry boundaries, and enforcement mechanisms.

## 2. Core Principles

### 2.1 Privacy by default

Telemetry upload is disabled unless the user explicitly enables it.

### 2.2 Fail closed

Unknown consent, entitlement, feature, credential, schema, or server-validation state blocks telemetry upload.

### 2.3 Data minimization

The minitok server accepts licensing, billing, account, installation, and allowlisted telemetry data required by its implementation. User prompts, source code, file contents, repository metadata, LLM content, and credentials are not sent to the minitok server by the telemetry client.

### 2.4 Entitlement is separate from consent

A subscription or entitlement does not imply telemetry consent. Entitlement controls feature access; consent controls telemetry transmission. Both are required for telemetry upload.

## 3. Data Classification Summary

| Class | Label | Current boundary |
|---|---|---|
| D0 | PUBLIC | Public product and operational information |
| D1 | LICENSE | Activation and entitlement lifecycle data sent to the minitok server |
| D2 | BILLING | Account, subscription, and payment-event data processed by the minitok server and payment provider |
| D3 | TELEMETRY | Allowlisted workflow metrics sent only after all upload gates pass |
| D4 | LOCAL_ONLY | User content and workflow content not sent to the minitok server |
| D5 | SECRET | API keys, private keys, passwords, and token values; not sent to the minitok server |

See [DATA_CLASSIFICATION.md](./DATA_CLASSIFICATION.md) for the field-level inventory.

## 4. Privacy Consent Model

### 4.1 Consent states

| State | Meaning | Behavior |
|---|---|---|
| UNKNOWN | Consent cannot be read or has not been established | Treat as OFF |
| OFF | Explicitly disabled or default state | No telemetry upload |
| ON | Explicitly enabled | Upload may proceed only after the other gates pass |

### 4.2 Consent storage and controls

Consent is stored in `~/.minitok/evolution/optin.json` with owner-only permissions. Users can run:

```bash
minitok evolution status
minitok evolution enable
minitok evolution disable
```

## 5. Entitlement Model

### 5.1 Current paid plans

The current commercial contract has three canonical plan IDs: `open`, `select`, and `private`; there is no free plan. `open` permits consent-required per-run evolution uploads when the signed capability allows it, `select` permits consent-required aggregate-only telemetry, and `private` never uploads or stores telemetry. Entitlement is required for all plan-gated execution.

### 5.2 Feature flags

The signed entitlement and server-side plan determine feature access. `evolution_upload` is required for telemetry and does not override user consent.

### 5.3 Verification chain

```text
Signed entitlement
  -> verify Ed25519 signature
  -> check expiration
  -> verify installation binding
  -> check requested feature
  -> check privacy consent for telemetry
  -> execute operation
```

## 6. Telemetry Upload Gates

All conditions must pass:

1. The entitlement is valid.
2. The entitlement or server plan authorizes `evolution_upload`.
3. Local consent is ON.
4. The client sanitizer accepts the payload.
5. A server URL and installation token are configured.
6. The server validates the bearer token, customer, subscription, plan, and feature.
7. The server accepts the exact allowlisted schema.
8. The telemetry record is stored successfully.

If any condition fails, the client does not send telemetry or the server does not store it.

## 7. Telemetry Payload

The current client and server allow exactly these fields:

- Required: `status`, `cycles`, `duration_ms`, `files_changed`
- Optional: `total_tokens`, `failure_category`
- `failure_category` values: `lint`, `test`, `validation`, `type_error`, `timeout`, `api_error`, `unknown`

No prompt, source code, path, repository name, LLM request or response, credential, or free-form error message is part of this allowlist.

## 8. Data That the Telemetry Boundary Does Not Send

The telemetry upload boundary excludes user prompts, task descriptions, source code, file contents, command output, terminal output, generated code or text, knowledge entries, repository names and paths, agent context or reasoning, LLM request/response content, path-bearing error messages, API keys, and credentials. Configured LLM providers may receive workflow data required by the user's configuration; that is a separate provider relationship and is not a minitok-server transfer.

## 9. Enforcement Architecture

| Boundary | Implementation |
|---|---|
| Client entitlement | `src/entitlement/gate.js` and related verification modules |
| Client consent | `src/evolution/optin.js` and `src/evolution/privacy.js` |
| Client allowlist | `src/evolution/sanitize.js` |
| Client network gate | `src/evolution/upload.js` |
| Server authentication | `src/middleware/auth.js` |
| Server subscription and feature checks | `src/services/evolution-telemetry.js` |
| Server schema and unknown-field rejection | `src/api/evolution-telemetry.js` |
| Server telemetry storage | `evolution_telemetry` schema and database adapter |

## 10. Operator and Legal Decisions Required

- TODO: Legal owner must approve the public privacy notice, legal bases, jurisdictions, controller/processor roles, international-transfer wording, and rights-response process.
- TODO: Operator must confirm production retention periods for account, billing, installation, audit, and backup data; the 90-day telemetry cleanup is an implementation setting, not a complete retention policy.
- TODO: Operator must confirm the authoritative support/contact address and effective date for public legal documents.

## 11. Future Changes

Cloud knowledge synchronization, diagnostic uploads, and organization-wide policy controls require a new classification and boundary review before implementation.
