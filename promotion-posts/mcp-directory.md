# MCP Directory

## Name
minitok MCP

## Short description
Repository-aware coding workflow controls for MCP clients with authentication, entitlement enforcement, policy boundaries, deterministic verification, and recorded evidence.

## Full description
minitok MCP exposes repository-aware coding workflow controls to MCP clients. The workflow separates repository research, planning, implementation, deterministic verification, review, repair, and evidence recording.

Supported transports:
- stdio
- authenticated localhost HTTP
- authenticated HTTPS remote MCP at `https://api.minitok.dev/mcp`

The remote endpoint exposes only read-only status and compaction tools. The MCP integration is not an AI model and does not replace the configured model provider.

## Setup
Use the installed package to generate host configuration:

```bash
minitok mcp connect <host>
```

## Links
- Documentation: https://minitok.dev/docs
- Source: https://github.com/floticinfo/minitok
- Package: https://www.npmjs.com/package/@flotic/minitok

## Security and privacy
- Never publish tokens, customer JWTs, installation-token files, or provider API keys.
- Authentication and entitlement checks remain enabled for production MCP constructors.
- Local MCP defaults to read permission; write and auto-accept policies must be explicitly configured.
- Telemetry is opt-in and disabled by default.

## Publication note
Submit only after the target directory's transport, authentication, entitlement, and privacy requirements have been reviewed by an operator. Local readiness checks do not prove publication, deployment, or production compatibility.
