# Community submission preview

`npm run community:preview -- --output reports/community-submission-preview.json` creates a local, side-effect-free submission manifest for the MCP directory and community channels listed in `PROMOTION_KIT.md`.

The preview does not authenticate, read or store credentials, make network requests, or submit posts. Use each platform's official login/OAuth flow and review the generated content before manually submitting. `--publish` is intentionally rejected.

The MCP directory entry must never include runtime tokens, customer JWTs, installation-token files, provider API keys, or account cookies.
