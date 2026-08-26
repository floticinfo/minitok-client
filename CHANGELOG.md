## 1.2.0 (2026-08-27)

### Changed
- License transition: MIT ¡æ Proprietary (All Rights Reserved)
- Software is now proprietary commercial software
- Copyright assigned to Flotic LC.
- All previously MIT-licensed versions have been deprecated on npm

# Changelog
## 1.1.4 (2026-08-27)

### Fixed
- Corrected trusted public key for key-2024-01-prod to match the actual production Ed25519 signer

### Security
- Entitlement verification now correctly validates production-issued entitlements
- Verification remains fail-closed for invalid signatures, tampering, unknown keys


## 1.1.3 (2026-08-26)

### Fixed
- "P2-01": Anthropic auth now falls back to API key entry when OAuth client is not configured
- "P3-01": OpenRouter provider now shown in minitok doctor output
- "P3-02": workspace add now automatically selects the newly added workspace as current
- Workspace state is now properly persisted and read from disk

### Security
- Auth module maintains fail-closed behavior for missing credentials


## 1.1.2 (2026-08-26)

### Fixed
- `minitok doctor` Node.js version threshold message aligned to `>=20.0.0` (was hardcoded `>=18`) to match `engines.node` policy in `package.json`.

## 1.1.1 (2026-08-26)

### Changed
- Node.js engine requirement aligned to `>=20.0.0` to match production customer-facing website messaging
- README badges and product-structure table updated to reflect Node 20+ runtime

### Fixed
- Public website now shows the correct installation command: `npm install -g @flotic/minitok` (no more unscoped `npm install -g minitok`)
- Public GitHub repository `DALIMNIM0/minitok-client` is now `public` (was private ??HTTP 404 to public customers)

### Notes
- Source is fully compatible with Node.js 18+; the `>=20.0.0` requirement is the published customer-facing policy to match the website's installation prerequisites banner.
- All public customer journey components (npm package, GitHub repo, website installation command, Node.js requirement) are now consistent.

## 1.1.0 (2026-08-25)

### Added
- Activation system: `minitok activate <key>` for license-based entitlement
- Activation key retrieval: `minitok activation-key --token <jwt>` for post-purchase key retrieval
- Checkout system: `minitok checkout` for Dodo/Stripe payment integration
- Customer portal: `minitok portal` for subscription management
- Runtime server: `minitok runtime start` for local MCP-compatible intelligence runtime
- Runtime MCP tools: knowledge_query, knowledge_record, analyze_failures, recommend_policy, compact_context, collect_evidence, status, observe
- Runtime health endpoint: `GET /health`, POST /api/v1/knowledge/*, /api/v1/context/compact, /api/v1/observations/ingest
- Self-evolution upload: sanitized telemetry with entitlement gating, feature opt-in, and strict sanitization
- Evolution opt-in/out: `minitok evolution enable|disable|status`
- Clock rollback detection in entitlement gate
- Offline grace mode (30 days) for expired entitlements
- Fixed pipeline exit code: `cmdRun` now returns 1 for failed pipelines (PD-1 fix)
- Comprehensive regression tests for exit code behavior

### Fixed
- Pipeline exit code now correctly reflects task outcome: SUCCESS/APPROVE ??0, FAILED/REJECTED/ERROR ??1
- `cmdRun` no longer returns 0 unconditionally for non-exception pipeline results

### Security
- Entitlement signature verification with Ed25519
- Entitlement payload canonicalization
- Public key rotation support
- Owner-only permissions on entitlement artifacts
- Evolution upload sanitizer rejects project data (goal, summary, source_code, etc.)
- Strict boolean check for evolution opt-in (no string "true" bypass)

## 1.0.1 (2026-08-19)

### Added
- 3-tier provider architecture: direct (Anthropic/OpenAI/Google), OpenRouter (200+ models), custom (any OpenAI-compatible API)
- 35-model catalog with reasoning/effort metadata
- Reasoning/thinking support for Anthropic (adaptive/enabled), OpenAI (6-level effort), Google (thinkingConfig)
- `minitok models` command with `--discover` for live API model listing
- `minitok auth` command for credential management (api_key, oauth, iam, service_account)
- Goal-directed task generation: pipeline evaluates overall goal achievement after each cycle
- Token budget enforcement: configurable `token_budget` with accurate per-provider token counting
- Context compaction: automatic repository context compression to stay within token limits
- Self-evolution: knowledge store records outcomes, adaptive policy adjusts retry behavior
- OpenRouter provider integration
- Custom provider support (Ollama, Bedrock proxy, enterprise LLMs)
- Google API key via header instead of URL query parameter (security)
- Security hardening: path traversal prevention, command injection prevention, YAML safe schema, fetch timeout, response size limit

### Fixed
- `minitok doctor` crash: async provider detection now properly awaited
- `minitok models` crash: same async/await fix
- `minitok status` crash: same async/await fix

### Removed
- `--offline` flag: the pipeline requires an LLM provider; use `--dry-run` for safe validation without file modifications
- `per_call_usd` budget setting: replaced with token-based `token_budget`

## 1.0.0 (2026-08-18)

### Added
- Initial npm release
- Core autonomous pipeline: plan ??implement ??verify ??iterate
- CLI commands: doctor, status, run, migrate, workspace management
- Workspace management with auto-detection of project type
- Configuration via `minitok.yml` with YAML safe parsing
- Provider abstraction with Anthropic, OpenAI, Google support
- Evidence collection (test/lint output)
- MIT license

