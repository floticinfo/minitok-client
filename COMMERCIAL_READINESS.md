# Commercial readiness checklist

This checklist records release-readiness evidence without changing the EULA, privacy policy, README, or implementation behavior. It is not a legal notice or a publication record.

| ID | Requirement | Status | Evidence required before release |
|---|---|---|---|
| legal-owner-approval | Legal owner approval for the EULA and commercial terms | BLOCKED | Approved evidence for the unresolved legal-owner decisions in `EULA.md` |
| privacy-owner-approval | Privacy owner approval for the public privacy materials | BLOCKED | Approved evidence for the unresolved privacy decisions in `POLICY.md` |
| support-commitments | Support commitments are approved and published | UNVERIFIED | Approved support terms and publication evidence |
| marketplace-registry-publication | Marketplace or registry publication is verified | UNVERIFIED | Registry or marketplace publication evidence for this release |
| production-operations | Production operational readiness is verified | UNVERIFIED | Approved production operations evidence, including unresolved operator decisions |

The machine-checkable diagnostic is:

```text
node scripts/commercial-readiness.mjs --json
node scripts/commercial-readiness.mjs --manifest path/to/approval-manifest.json --json
```

The unfilled `approval-manifest.template.json` documents the required schema. Set `MINITOK_COMMERCIAL_APPROVAL_MANIFEST` or use `--manifest` to supply a separately reviewed manifest. Every requirement needs `status`, `owner`, `decision`, typed `evidenceRef`, and a non-future ISO `approvedAt`; local evidence references resolve relative to the manifest, while external references must be explicitly typed. Support requires contact and escalation ownership; production operations requires rollback and monitoring ownership. Only the literal `APPROVED` status with non-empty fields can produce `PASS`. Missing, malformed, pending, or otherwise unapproved input remains `BLOCKED` or `UNVERIFIED`. The manifest must identify the release through `release.package` and `release.version`. Publication authorization and registry publication verification are separate approvals; authorization does not prove publication.

Technical readiness from `scripts/readiness-checks.mjs` is reported independently and may pass local checks. It does not promote legal, privacy, support, marketplace, registry, or production operations to approval. Any `BLOCKED` or `UNVERIFIED` commercial result is a release-verification failure. No result is inferred from a local package, local source tree, or successful automated test.

## Stage 3 customer-facing checks

Run `npm run readiness:all` for deterministic local checks separated into Extension, CLI, and MCP surfaces. The authoritative generated VSIX is `extension/artifacts/minitok-extension-<extension-version>.vsix`; unrelated or stale VSIX candidates remain diagnostic evidence only and are never deleted. CLI evidence covers npm dry-run files, bin, engines, help, and non-TTY behavior. MCP evidence covers the packaged stdio entrypoint, token-file/session isolation, localhost HTTP authentication, and per-session isolation. Artifact evidence uses `npm run package:cli`, `npm run artifact:runtime`, `npm run artifact:http`, `node scripts/artifact-report.mjs extension`, and `npm run release:artifacts`. `npm run readiness:checks` remains an alias. Use `node scripts/readiness-checks.mjs --target extension|cli|mcp --json` for one surface or machine-readable output. `PASS` means local evidence was found, `BLOCKED` means a required local contract is missing and exits with status 1, and `UNVERIFIED` means publication, marketplace, registry, approval, remote, or production evidence is unavailable; unverified-only results exit with status 0. Human output includes per-check statuses and a summary. The checks do not contact production by default.
