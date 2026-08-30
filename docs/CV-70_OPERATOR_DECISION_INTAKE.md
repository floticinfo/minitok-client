# CV-70 Operator Decision Intake — Client

Date: 2026-08-29
Repository: `C:\Users\J1\minitok-client-release`
Scope: CV-69 reconciliation, read-only local inspection, public read-only parity inspection, and operator decision intake. No prohibited operation was performed.

## CV-69 baseline

| Field | Value |
|---|---|
| HEAD | `c37927d8f158f8d2c963635cac9ad648b530412f` |
| Branch | `master` |
| Version | `1.3.0` |
| Worktree | DIRTY: 17 modified tracked paths, 23 untracked paths |
| Release files | `bin/`, production `src/`, `package.json`, `package-lock.json`, `README.md`, `LICENSE`, `CHANGELOG.md` as applicable |
| Client trusted key | ID `key-2024-01-prod`; SPKI `0a1dab40cb5b8782bf6543d0d2885c81e5ccc2b0a60b8b0bf957e984eb920dc3` |
| Local server key from CV-69 | ID `key-2024-01-prod`; SPKI `0e286050e61a95f22f716acc6686be3db18aceb544b4f6548d8a99f29ce06b8d` |
| Production signer | NOT VERIFIED |
| Database | No client database surface; combined production DB remains NOT VERIFIED |
| Local artifact | `npm pack --dry-run` PASS; 71 files, 68,982 packed bytes |
| Local tests | 71/71 PASS; broad sweep 503/503 PASS |
| Public client marker | `1.3.0` observed on `https://minitok.dev/` and public docs |

No CV-69 fact was silently overwritten. Current inspection agrees with CV-69.

## Candidate source classification

| Classification | Client entries |
|---|---|
| RELEASE | Modified `package.json`, `package-lock.json`, `README.md`, `bin/minitok.js`, CLI checkout/activation files, entitlement/runtime files, pipeline/MCP files; untracked `src/entitlement/online.js`, `src/evolution/privacy.js` and their production support files |
| SECURITY | Entitlement, online validation, privacy/sanitization, activation and runtime gate changes and security fixtures/tests |
| DATABASE | NONE in client |
| DEPLOYMENT | NONE in client; package metadata remains release-relevant |
| WEBSITE | `README.md`; public website is server-owned |
| TEST | Tracked and untracked test files and captured test output |
| AUDIT | `docs/CV-*`, `DATA_CLASSIFICATION.md`, `POLICY.md`, `PHASE27_DATA_CLASSIFICATION_PRIVACY_ENTITLEMENT_AUDIT_REPORT.md`, `cv38-final-contents.txt`, `client_test_output.txt` |
| EXPERIMENTAL | NONE separately proven; CV-specific/security fixtures require operator disposition |
| UNKNOWN | Exact final inclusion/exclusion set for every dirty entry |

### Client candidate source

```text
HEAD: c37927d8f158f8d2c963635cac9ad648b530412f
included paths: OPERATOR SELECTION REQUIRED from RELEASE + SECURITY entries above
excluded paths: AUDIT entries; TEST entries are excluded from npm package by files allowlist, but are not automatically excluded from source freeze
unresolved paths: all current modified/untracked entries pending operator classification
```

The SHA is a dirty-source baseline only and is not approved as an immutable source.

## Shared operator decision sheet

```text
==================================================
CV-70 OPERATOR DECISION SHEET
==================================================

A. IMMUTABLE SOURCE PAIR

Client SHA: c37927d8f158f8d2c963635cac9ad648b530412f
Server SHA: c49a699eb46cc1c846d771523049240a945f097f

Approve:
[ ] YES
[ ] NO

Notes:


B. SIGNING IDENTITY

Client trusted key:
key ID: key-2024-01-prod
SPKI: 0a1dab40cb5b8782bf6543d0d2885c81e5ccc2b0a60b8b0bf957e984eb920dc3

Local server key:
key ID: key-2024-01-prod
SPKI: 0e286050e61a95f22f716acc6686be3db18aceb544b4f6548d8a99f29ce06b8d

Production signer:
key ID: ____________________
SPKI: ____________________

Canonical signer:
____________________

Approve:
[ ] YES
[ ] NO

IMPORTANT:
No key rotation is authorized by CV-70.


C. DATABASE ADOPTION

Recommended strategy:
Strategy C

Approve Strategy C:
[ ] YES
[ ] NO

Production preconditions:
- backup/restore strategy
- read-only schema inspection
- duplicate scan
- index conflict check
- migration/adoption procedure
- post-migration verification

Approve:
[ ] YES
[ ] NO


D. 0008 UNIQUENESS

Recommended:
provider-scoped uniqueness

Canonical rule:
(provider, provider_event_id), partial unique where provider_event_id IS NOT NULL

Approve:
[ ] YES
[ ] NO


E. BILLING PROVIDER POLICY

Option A:
Dodo = canonical
Stripe = isolated legacy compatibility

Option B:
Remove Stripe before release

Selected:
[ ] A
[ ] B

CV-69 recommendation: Option A, not approved.


F. RELEASE VERSION

Client:
1.3.0 observed; operator approval pending

Server:
0.1.0 observed; operator approval pending

Version bump is NOT performed in CV-70.


G. PRODUCTION EVIDENCE AUTHORIZATION

Production signer read-only inspection:
[ ] Available
[ ] Not available

Production DB read-only inspection:
[ ] Available
[ ] Not available

Registry/deployment provenance inspection:
[ ] Available
[ ] Not available
```

## Production evidence

- Signing: production key ID, production SPKI, and runtime configuration source are NOT VERIFIED. No private key was printed, copied, rotated, or inspected.
- Database: client has no DB surface. No production `DATABASE_URL` or DB access was available. Production tables, columns, constraints, indexes, foreign keys, journal, duplicate provider pairs, and subscription aggregates remain NOT VERIFIED.
- Image provenance: no client production image or registry/deployment chain is owned by this repository. Production provenance remains NOT VERIFIED.
- Public parity: `https://minitok.dev/` and docs were reachable; client `1.3.0` markers were observed. Immutable source/artifact/runtime binding remains NOT VERIFIED.

## Freeze readiness

```text
IMMUTABLE SOURCE PAIR = NOT APPROVED
SIGNING = NOT VERIFIED
DB = NOT VERIFIED
DB ADOPTION = NOT APPROVED
0008 = NOT APPROVED
IMAGE PROVENANCE = NOT VERIFIED
PUBLIC PARITY = NOT VERIFIED
STRIPE/DODO = OPERATOR DECISION REQUIRED

READY FOR IMMUTABLE RC: NO
READY FOR VERSION BUMP: NO
```

## Sequencing

```text
CV-70
  ↓
OPERATOR DECISIONS
  ↓
PRODUCTION READ-ONLY EVIDENCE
  ↓
SOURCE FREEZE
  ↓
CV-71 IMMUTABLE SOURCE FREEZE
  ↓
VERSION BUMP
  ↓
CV-72 RC ARTIFACT / IMAGE
  ↓
CV-73 PROVENANCE + DEPLOYMENT
  ↓
CV-74 PUBLIC PARITY
  ↓
CV-75 AUTHORIZED DODO COMMERCIAL GATE
  ↓
FINAL RELEASE APPROVAL
```

## Verdict

`PRE-RC BLOCKED — OPERATOR INPUT / PRODUCTION EVIDENCE REQUIRED`

Freeze may not proceed until the operator decision sheet is completed and the required production evidence is supplied. No version bump, commit, tag, publication, deployment, payment, webhook, DB write, backup/restore, or key operation was performed.
