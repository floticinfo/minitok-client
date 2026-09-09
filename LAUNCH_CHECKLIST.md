# minitok launch checklist

## Public facts to use

- GitHub: https://github.com/floticinfo/minitok
- npm: https://www.npmjs.com/package/@flotic/minitok
- Current CLI: `@flotic/minitok@1.3.10`
- Website: https://minitok.dev
- Docs: https://minitok.dev/docs

## Demo recording

1. Create a disposable repository and record the exact commit.
2. Run `npm install -g @flotic/minitok@1.3.10`.
3. Run `minitok doctor` and show provider configuration without exposing keys.
4. Run `minitok migrate`.
5. Run a small task with tests and documentation.
6. Show the verification result, changed files, `minitok status`, and evidence path.
7. Blur repository paths, customer identifiers, tokens, and provider output that contains sensitive data.

Do not publish a recording until the repository-local verification command passes.

## Current evidence status

`DEMO_EVIDENCE.md` records a reproducible dry-run prerequisite check. `BENCHMARK_EVIDENCE.json` explicitly records that no real paired benchmark has been run. Do not publish performance claims until repeated baseline and minitok runs produce sanitized raw data.

## Submission order

1. Publish the demo and raw benchmark evidence in the GitHub repository.
2. Submit the Show HN post with the GitHub link.
3. Share the technical Reddit post in a community whose rules allow project posts.
4. Publish the Product Hunt listing with the demo link.
5. Publish the concise LinkedIn announcement with the website and docs links.
6. Submit the MCP listing only after the transport, authentication, and entitlement behavior are documented for the target directory.

## Exact links for every post

Use `https://github.com/floticinfo/minitok` as the source link, `https://minitok.dev/docs` as the documentation link, and `https://www.npmjs.com/package/@flotic/minitok` as the install link. Do not use the former `minitok-client` repository name.

## Evidence requirements

- Exact repository commit.
- Model and provider names.
- Task prompt.
- Verification command and exit code.
- Changed-file list.
- Duration, token usage, and cost when available.
- Manual intervention count.
- Sanitized raw JSON for repeated benchmark runs.

## Claims to avoid

Do not claim guaranteed correctness, universal speedups, zero risk, deployment proof, unattended operation, or that minitok is an AI model. Disclose that provider costs and paid entitlement requirements apply.
