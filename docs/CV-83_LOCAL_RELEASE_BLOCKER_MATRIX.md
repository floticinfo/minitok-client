# CV-83 Local Release Blocker Matrix

## Scope

Repository: `C:\Users\J1\minitok-client-release`
Package: `@flotic/minitok@1.3.3`
Date: 2026-09-07

This report records read-only local release, commercial, registry, artifact, provenance, and documentation checks. No commit, tag, publish, deploy, legal-document edit, approval, or production mutation was performed.

## Current identity

| Check | Result | Evidence |
|---|---|---|
| Canonical source | PASS as source selection | `C:\Users\J1\MINITOK_ARTIFACT_INDEX.md`; `MINITOK_ARTIFACT_ROLE.txt` |
| Package identity | PASS locally | `package.json`: `@flotic/minitok@1.3.3` |
| Worktree | BLOCKED | `git status --short --untracked-files=all`: modified and untracked release/source files |
| HEAD | `edc0dd63eacdce0332d9ff58bbb3f2a5cda539d7` | `git rev-parse HEAD` |
| HEAD tree | `9b9f953e120ce473f367873580d8e654f559974a` | `git rev-parse 'HEAD^{tree}'` |
| Release tag | BLOCKED | `git tag --points-at HEAD`: no tag |
| Release manifest | BLOCKED | `npm run release:manifest`: `release-manifest.json` is absent; generation refuses dirty/untagged source |

## Checks that pass locally

| Area | Result | Command/evidence |
|---|---|---|
| Lint | PASS | `npm run lint` |
| Typecheck | PASS | `npm run typecheck` |
| Dependency audit | PASS | `npm audit --audit-level=high`; 0 vulnerabilities |
| Secret scan | PASS | `node scripts/secret-scan.mjs`; 342 tracked/added files scanned |
| Documentation consistency | PASS | `npm run docs:check` |
| Stage 2 local parity | PASS, production unverified | `npm run stage2:parity` |
| Extension typecheck/compatibility | PASS, local-only | `npm run extension:marketplace:check` |
| Extension artifact | PASS, local-only | `npm run release:artifacts`; `extension/artifacts/minitok-extension-0.1.4.vsix`, SHA-256 `edfbc4490c00724701ab67be700cbb3a194831b4628360764c90713809f4eaf8` |
| Surface readiness | PASS local contracts; 3 UNVERIFIED | `npm run readiness:all`; PASS 25, BLOCKED 0, UNVERIFIED 3 |
| Registry compatibility | PASS metadata shape only | `MINITOK_ALLOW_LIVE_REGISTRY=1 npm run registry:compat` |

## Current failures and limitations

| Blocker | Status | Evidence | Local resolution |
|---|---|---|---|
| Dirty source / no immutable ref | BLOCKED | `npm run release:verify`; `git status`; no tag | Requires authorized review, commit, and tag. Not performed. |
| Missing release manifest | BLOCKED | `npm run release:manifest` reports absent `release-manifest.json` | Can be generated only after clean tagged source; no local authority to create release identity. |
| Commercial approvals | BLOCKED/UNVERIFIED | `npm run commercial:readiness`: legal BLOCKED, privacy BLOCKED, support/publication/registry/operations UNVERIFIED | Requires separately reviewed approval manifest using `approval-manifest.template.json`; no approvals fabricated. |
| Local source versus registry provenance | BLOCKED for candidate provenance | `npm view @flotic/minitok version dist-tags gitHead dist --json`: registry `1.3.3`, gitHead `2f7d2e095740803d291d1dbfaaf1f90cddb2e388`, fileCount 86; local `npm pack --dry-run --json`: 101 files, unpackedSize 498888, SHA-512 integrity `sha512-ooicmtRcGzKKfmPzKlXEq0/xAPRHOzAvaCE74EuU6CLk4T+oSNquShQTowwa9zi6K+AGwAyBpYgrTsV2UVZ3fQ==` | Requires approved immutable source/artifact pairing and provenance review. Registry publication itself is not evidence that this worktree was published. |
| Registry publication verification | UNVERIFIED for release gate | `npm run readiness:all`; CLI registry and extension marketplace checks are local/unverified | Requires operator-approved publication/marketplace evidence and live verification after authorization. |
| Remote MCP/production entitlement | UNVERIFIED | `npm run readiness:all`; MCP remote deployment check | Requires support/operations-owned deployment, auth, and entitlement evidence. |
| Support commitments | UNVERIFIED | `COMMERCIAL_READINESS.md`; commercial readiness output | Requires support owner, escalation owner, approved terms, and evidence reference. |
| Production operations | UNVERIFIED | `COMMERCIAL_READINESS.md`; commercial readiness output | Requires rollback owner, monitoring owner, approved operations evidence. |
| Legal/privacy decisions | BLOCKED | `EULA.md`, `POLICY.md`, commercial readiness output | Requires legal/privacy owner approval; documents were not modified. |
| Full test suite stability | FAIL in current runs | First `npm test`: 846 total, 839 pass, 1 fail at `tests/test-mcp-http-lock.js:54` due concurrent writer count 2; `node VERIFY_CMD.mjs`: 846 total, 839 pass, 1 fail at `tests/test-m4-launch.js:56` due Windows `EPERM` rename in `src/entitlement/gate.js:88` | Product/test-owner investigation and rerun in isolated environment required. Not silently reclassified as pass. |

## Exact operator actions still required

1. Review and classify the dirty worktree, then create an authorized commit and immutable release tag, for example `git add <approved paths>`, `git commit -m "<approved release message>"`, and `git tag v1.3.3`. These commands require user authority and were not run.
2. After the tagged clean source exists, run `npm run release:manifest:generate`, then `npm run release:manifest`, `npm run release:verify`, and the complete release gate.
3. Obtain legal and privacy approvals for `EULA.md` and `POLICY.md`; record them in a separately reviewed manifest based on `approval-manifest.template.json`.
4. Obtain support and production-operations approvals with contact/escalation, rollback, and monitoring owners.
5. Obtain explicit publication authorization. Only then perform any approved npm or marketplace publication command; no publish command was run.
6. Reconcile the local candidate with registry provenance and retain the registry tarball URL, integrity, file count, and release commit evidence.
7. Resolve or formally disposition the two current test failures, then rerun `npm test`, `node VERIFY_CMD.mjs`, `npm run release:verify`, and `npm run readiness:all` on the immutable candidate.

## Final decision

`RELEASE BLOCKED`.

Locally resolvable evidence is complete for lint, typecheck, audit, secret scan, documentation consistency, local artifact checks, extension compatibility, and local surface contracts. Remaining release blockers require source-history authority, legal/privacy approval, support/operations approval, test-owner disposition, or publication/provenance authorization.
