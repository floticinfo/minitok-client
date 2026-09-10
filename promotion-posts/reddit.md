# Reddit

## Suggested title
I built a coding-agent workflow that makes verification and evidence first-class

## Body
AI coding tools can generate changes quickly, but repository work also needs planning, project checks, review, repair, and a record of what happened.

minitok is a Node.js CLI that separates those stages:

- repository research
- explicit planning
- implementation
- deterministic verification
- review
- repair after failures
- sanitized evidence recording

It supports multiple LLM providers and keeps execution local-first. Telemetry is opt-in and disabled by default.

I am sharing the installable package, a disposable-repository demo procedure, and a benchmark format that records raw runs, models, commits, costs, verification results, and manual interventions. I am not claiming universal superiority or guaranteed correctness; I am looking for technical feedback on the workflow boundaries and evidence model.

Project: https://github.com/floticinfo/minitok
Docs: https://minitok.dev/docs
Package: https://www.npmjs.com/package/@flotic/minitok

Install:

```bash
npm install -g @flotic/minitok
minitok doctor
```

minitok is paid software and provider costs apply. Please follow each community's project-promotion rules before posting.
