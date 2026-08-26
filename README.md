# minitok

> Repository-aware autonomous coding workflow driver

[![npm version](https://img.shields.io/npm/v/minitok.svg)](https://www.npmjs.com/package/@flotic/minitok)
[![Node.js](https://img.shields.io/badge/node-%3E%3D20-brightgreen.svg)](https://nodejs.org)

## Quick Start

```bash
# Install
npm install -g @flotic/minitok

# Check environment
minitok doctor

# Initialize a repository
cd your-repo
minitok migrate

# Activate your license (required for real execution)
minitok activate <your-license-key>

# Set up your provider
minitok auth login anthropic  # or openai, google

# Run autonomous coding
minitok run "Fix the authentication bug"
```

### First-time setup

1. **Install** ??`npm install -g @flotic/minitok`
2. **Doctor** ??`minitok doctor` checks environment, API keys, and providers
3. **Migrate** ??`minitok migrate` initializes your repository as a workspace
4. **Activate** ??`minitok activate <key>` activates your license (required)
5. **Auth** ??`minitok auth login <provider>` stores your API key
6. **Run** ??`minitok run "your task"` starts the autonomous pipeline

## Commands

| Command | Description |
|---------|-------------|
| `minitok --version` | Print version |
| `minitok doctor` | Check environment, API keys, and providers |
| `minitok status` | Show current workspace state and git info |
| `minitok run <task>` | Run autonomous coding cycle |
| `minitok run <task> --dry-run` | Plan only ??no file modifications |
| `minitok run <task> --auto-accept` | Skip confirmation prompts |
| `minitok migrate [path]` | Initialize repository as workspace |
| `minitok models [provider]` | List available LLM models |
| `minitok models --discover` | Fetch live model list from provider APIs |
| `minitok auth login <provider>` | Store credentials for a provider |
| `minitok auth status` | Show stored credentials |
| `minitok auth logout <provider>` | Remove stored credentials |
| `minitok workspace add [path] [name]` | Register a workspace |
| `minitok workspace list` | List registered workspaces |
| `minitok workspace use <name>` | Switch workspace |
| `minitok workspace current` | Show current workspace |
| `minitok workspace remove <name>` | Remove a workspace |

## Configuration

Create `minitok.yml` in your repository root:

```yaml
project:
  name: my-project
  stack: python  # python|node|rust|go|generic

roles:
  plan:
    adapter: claude
    effort: medium
    reasoning: adaptive  # or: enabled, disabled
  work:
    adapter: claude
    effort: high
  review:
    adapter: claude
    effort: high

budget:
  token_budget: 500000   # max tokens per run
  max_cycles: 3          # max plan?뭝mplement?뭭erify iterations

execution:
  max_retries: 3
  timeout_sec: 600
  research_enabled: true
```

### Provider Configuration

minitok supports three tiers of LLM providers:

**Tier 1 ??Direct providers** (built-in catalog with reasoning/effort metadata):

```yaml
providers:
  anthropic:
    api_key: ${ANTHROPIC_API_KEY}
  openai:
    api_key: ${OPENAI_API_KEY}
  google:
    api_key: ${GOOGLE_AI_KEY}
```

**Tier 2 ??OpenRouter** (200+ models via single API):

```yaml
providers:
  openrouter:
    api_key: ${OPENROUTER_API_KEY}

roles:
  plan:
    adapter: openrouter
    model: anthropic/claude-sonnet-5  # OpenRouter model ID
```

**Tier 3 ??Custom** (any OpenAI-compatible API):

```yaml
providers:
  ollama:
    base_url: http://localhost:11434/v1
    api_key: "ollama"

roles:
  plan:
    adapter: ollama
    model: llama-3.3-70b
```

### Reasoning / Effort

For supported models, you can enable extended reasoning:

| Provider | Setting | Values |
|----------|---------|--------|
| Anthropic | `reasoning` | `adaptive`, `enabled`, `disabled` |
| Anthropic | `thinking_budget` | Token budget (e.g. `15000`) |
| OpenAI | `effort` | `none`, `low`, `medium`, `high`, `xhigh`, `max` |
| Google | `reasoning` | `dynamic`, `budget` |

## Environment Variables

| Variable | Description |
|----------|-------------|
| `ANTHROPIC_API_KEY` | Anthropic API key (Claude) |
| `OPENAI_API_KEY` | OpenAI API key (GPT) |
| `GOOGLE_API_KEY` | Google API key (Gemini) |
| `OPENROUTER_API_KEY` | OpenRouter API key (200+ models) |

## How It Works

minitok runs an autonomous coding loop:

1. **Plan** ??Analyzes the task and repository, generates an implementation plan
2. **Implement** ??Produces code changes based on the plan
3. **Verify** ??Reviews changes for correctness, security, and quality
4. **Iterate** ??If not approved, incorporates feedback and retries

Additional features:

- **Goal-directed iteration** ??After each successful cycle, minitok evaluates whether the overall goal is achieved or if further work is needed
- **Token budget** ??Enforces configurable token limits to prevent runaway costs
- **Self-evolution** ??Records execution outcomes and adapts retry policy based on failure patterns
- **Context compaction** ??Automatically compresses repository context to stay within token limits

### Confirmation & Safety

minitok requires explicit user confirmation before applying the first batch of file changes in an interactive terminal session. This ensures you review proposed changes before they are written to disk.

- **Interactive mode** (TTY): Displays proposed file changes (create/modify/delete) and prompts for approval before the first file operation. Once approved, the autonomous pipeline continues without further prompts for the remainder of the run.
- **`--auto-accept`**: Skips confirmation entirely. Intended for CI/automated workflows or when you trust the autonomous pipeline.
- **`--dry-run`**: Validates and plans without modifying any files. No confirmation prompt is shown.
- **Non-interactive mode** (no TTY, e.g. CI): Auto-accepts with a stderr warning. Use `--auto-accept` explicitly in CI for clarity.

Certain files are always protected from autonomous modification: `minitok.yml` and `.minitok/` contents cannot be changed by the pipeline.

## Authentication

Credentials are stored in `~/.minitok/tokens/`. You can authenticate via:

- **API key**: `minitok auth login anthropic` ??enter key
## Activation

minitok requires activation before running the autonomous pipeline. The activation system uses a license key to generate a signed entitlement artifact stored locally.

### Activation Flow

1. **Purchase** ??Visit the [Pricing page](https://minitok.dev/pricing) and complete checkout. After purchase, you will receive a JWT authentication token.

2. **Retrieve your activation key** ??Use the JWT from checkout to retrieve your activation key (one-time retrieval):
   ```bash
   minitok activation-key --token <your-jwt-token>
   ```
   Optionally include the payment ID:
   ```bash
   minitok activation-key --token <jwt> --payment <dodo_payment_id>
   ```

3. **Activate** ??Activate with the retrieved key:
   ```bash
   minitok activate <your-activation-key>
   ```
   This contacts the minitok server at `https://api.minitok.dev`, validates the key, and stores the entitlement locally.

### Activation Status

Check activation status with:
```bash
minitok status
```

If activation is missing, the status command will show "Entitlement: MISSING" and the pipeline will refuse to execute.

### What Happens If Activation Fails

- **Invalid key**: `minitok activate <bad-key>` ??"Activation key not found" (exit code 1)
- **No network**: The entitlement gate includes a 30-day offline grace period after initial activation
- **Expired license**: The pipeline blocks with a clear "Your minitok entitlement has expired" message
- **Clock rollback detected**: The system detects system clock manipulation and blocks execution

### Checking Activation

```bash
minitok status
```

Expected output when activated:
```
Entitlement: ALLOWED
Plan: pro
Expires: 2026-09-24T...
```

Expected output when not activated:
```
Entitlement: MISSING
```
- **OAuth** (GitHub Copilot): `minitok auth login github` ??browser flow
- **IAM** (AWS Bedrock): configured via AWS credential chain
- **Service Account** (GCP Vertex AI): configured via `GOOGLE_APPLICATION_CREDENTIALS`
- **None** (Ollama): no authentication needed

## Runtime (M3)

minitok can operate as a local intelligence runtime for external coding agents (Claude Code, Codex, OpenCode, Cline, etc.).

### Start Runtime

```bash
minitok runtime start
```

- Binds to `127.0.0.1:4578` (localhost only, no external network exposure)
- On-demand model: starts when requested, shuts down after 30 minutes idle
- No authentication required (localhost-only security)

### Health Check

```bash
curl http://127.0.0.1:4578/health
# ??{"status":"ok","uptime_ms":...}
```

### MCP Integration

The Runtime exposes an MCP-compatible stdio transport for AI coding agents:

```bash
node src/runtime/stdio-entry.js
```

### MCP Tools

| Tool | Description |
|---|---|
| `minitok_knowledge_query` | Query past evolution outcomes |
| `minitok_knowledge_record` | Record an evolution outcome |
| `minitok_analyze_failures` | Analyze failure patterns |
| `minitok_recommend_policy` | Get execution policy recommendations |
| `minitok_compact_context` | Compact text to fit token budget |
| `minitok_collect_evidence` | Collect test/lint evidence |
| `minitok_status` | Show entitlement and knowledge status |
| `minitok_observe` | Submit observation events from external agent |

**MCP tools are read-only intelligence interfaces.** They cannot write files, execute commands, or modify the repository.


## Requirements

- Node.js >= 20.0.0
- git
- A valid minitok license key (for real execution)
- At least one LLM API key (Anthropic, OpenAI, or Google)

## Product Structure

minitok has two distribution forms:

| | Python | npm (this package) |
|---|---|---|
| **Install** | `pip install minitok` | `npm install -g @flotic/minitok` |
| **Runtime** | Python 3.10+ | Node.js 20+ |
| **Activation** | Not required | Required (entitlement gate) |
| **Provider setup** | Install adapter CLIs | `minitok auth login` + API keys |
| **License** | Proprietary | Commercial |

**npm minitok** is the commercial product with provider management, activation, and subscription handling. **Python minitok** is the core pipeline (see `pip install minitok`).

## License

MINITOK is proprietary commercial software. See [LICENSE](LICENSE) for details.

The minitok service requires a valid license key for real execution (see [Activation](#activation)).


