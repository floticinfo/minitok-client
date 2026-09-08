# minitok Authentication Contract v1

The canonical contract is maintained in the server repository:

- `../minitok-server-deploy/docs/AUTH_CONTRACT_V1.md`
- `../minitok-server-deploy/docs/auth-contract-v1.customer-jwt.schema.json`
- `../minitok-server-deploy/docs/auth-contract-v1.fixture.json`

The client must preserve the following compatibility rules:

- Customer JWT: `iss=minitok-server`, `aud=minitok:customer`, UUID `sub`, `iat`, `exp`.
- Installation JWT: `iss=minitok-server`, `aud=minitok:installation`, `token_type=installation`, installation and subscription UUIDs.
- Signed Ed25519 entitlement is separate from bearer authentication.
- Local MCP uses its short-lived runtime token; it never accepts the customer JWT as a local runtime token.
- Remote MCP uses the customer JWT and server-issued `Mcp-Session-Id` and exposes only `minitok_status` and `minitok_compact`.
- `minitok auth login <provider>` remains LLM-provider authentication.
- Runtime plan IDs are `open`, `select`, and `private`.
