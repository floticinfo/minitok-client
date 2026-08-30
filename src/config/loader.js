"use strict";

/**
 * Config loader — loads and validates minitok.yml.
 * Priority: defaults → global → local → env vars → CLI overrides.
 */

const fs = require("fs");
const path = require("path");
const os = require("os");
const yaml = require("js-yaml");
const { ConfigError } = require("../core/errors");

const ENV_PREFIX = "minitok_";
const _ROLE_KEYS = new Set(["plan", "review", "work", "intel"]);

const DEFAULTS = {
  offline: false,
  default_provider: "",
  project: { name: "unknown", stack: "generic" },
  roles: {
    plan: { provider: "", adapter: "claude", model: "", effort: "medium", reasoning: null, thinking_budget: 0, tools: ["Read", "Write", "Edit"], fallback_model: "", fallback: [], variant: null, mode: "tui", timeout_sec: 300 },
    review: { provider: "", adapter: "claude", model: "", effort: "medium", reasoning: null, thinking_budget: 0, tools: ["Read", "Write", "Edit"], fallback_model: "", fallback: [], variant: null, mode: "tui", timeout_sec: 300 },
    work: { provider: "", adapter: "claude", model: "", effort: "medium", reasoning: null, thinking_budget: 0, tools: ["Read", "Write", "Edit"], fallback_model: "", fallback: [], variant: null, mode: "tui", timeout_sec: 300 },
    intel: { provider: "", adapter: "claude", model: "", effort: "medium", reasoning: null, thinking_budget: 0, tools: ["Read", "Write", "Edit"], fallback_model: "", fallback: [], variant: null, mode: "tui", timeout_sec: 300 },
  },
  budget: {
    max_cycles: "unlimited",
    token_budget: "unlimited",
    max_cycles_hard_limit: 100,
    token_hard_limit: 2000000,
    stagnation_limit: 3,
  },
  execution: {
    max_retries: "unlimited",
    timeout_sec: "unlimited",
    retry_hard_limit: 5,
    timeout_hard_limit_sec: 86400,
    retry_backoff_sec: 90.0,
    retry_max_sec: 1800.0,
    research_enabled: true,
    search: { web: { endpoint: "", api_key: "" }, github: { token: "", base: "" } },
  },
  validation: { enabled: true, script_path: "VERIFY_CMD.mjs", timeout_ms: 120000, confidence_threshold: 0.8, max_changed_files: 20 },
};

function deepMerge(base, override) {
  const result = { ...base };
  for (const [key, value] of Object.entries(override)) {
    if (key in result && typeof result[key] === "object" && !Array.isArray(result[key]) && typeof value === "object" && !Array.isArray(value)) {
      result[key] = deepMerge(result[key], value);
    } else {
      result[key] = value;
    }
  }
  return result;
}

/**
 * Safely coerce a string value to its native type.
 * Handles null/undefined/empty to prevent TypeError.
 */
function coerceValue(value) {
  if (value == null || value === "") return null;
  const s = String(value);
  if (["true", "yes", "1"].includes(s.toLowerCase())) return true;
  if (["false", "no", "0"].includes(s.toLowerCase())) return false;
  const int = parseInt(s, 10);
  if (!isNaN(int) && String(int) === s) return int;
  const float = parseFloat(s);
  if (!isNaN(float) && String(float) === s) return float;
  return s;
}

function loadEnvVars() {
  const result = {};
  for (const [key, value] of Object.entries(process.env)) {
    if (!key.startsWith(ENV_PREFIX)) continue;
    const configKey = key.slice(ENV_PREFIX.length).toLowerCase();
    const parts = configKey.split("_");
    let nested = result;
    for (let i = 0; i < parts.length - 1; i++) {
      if (!nested[parts[i]] || typeof nested[parts[i]] !== "object") nested[parts[i]] = {};
      nested = nested[parts[i]];
    }
    nested[parts[parts.length - 1]] = coerceValue(value);

    if (_ROLE_KEYS.has(parts[0])) {
      if (!result.roles) result.roles = {};
      const roleNested = {};
      let cur = roleNested;
      for (let i = 0; i < parts.length - 1; i++) {
        cur[parts[i]] = {};
        cur = cur[parts[i]];
      }
      cur[parts[parts.length - 1]] = coerceValue(value);
      result.roles = deepMerge(result.roles, roleNested);
    }
  }
  return result;
}

function loadYaml(filePath) {
  try {
    const data = fs.readFileSync(filePath, "utf-8");
    // 🔒 Use safe schema to prevent YAML code execution attacks (!!js/function etc.)
    const parsed = yaml.load(data, { schema: yaml.DEFAULT_SAFE_SCHEMA });
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch (e) {
    if (e.code === "ENOENT") return {};
    throw new ConfigError(`Invalid YAML in ${filePath}: ${e.message}`);
  }
}

function resolveProviderName(config, role, override) {
  const providers = config?.providers || {};
  const roleConfig = config?.roles?.[role] || {};
  return override || roleConfig.provider || roleConfig.adapter || config?.default_provider || Object.keys(providers)[0] || "";
}

function loadConfig(configPath, overrides) {
  let raw = {};

  // 2. User global config
  const globalPath = path.join(os.homedir(), ".config", "minitok", "config.yml");
  raw = deepMerge(raw, loadYaml(globalPath));

  // 3. Project local config — resolve from explicit path, then repoRoot, then CWD
  const candidates = [
    configPath,
    path.join(overrides?.repoRoot || process.cwd(), "minitok.yml"),
    "minitok.yml",
  ].filter(Boolean);
  let resolved = false;
  for (const candidate of candidates) {
    if (resolved) break;
    try {
      const stat = fs.statSync(candidate);
      if (stat.isFile()) {
        raw = deepMerge(raw, loadYaml(candidate));
        resolved = true;
      }
    } catch {}
  }

  // 4. Environment variables
  raw = deepMerge(raw, loadEnvVars());

  // 5. CLI overrides
  if (overrides) raw = deepMerge(raw, overrides);

  // Merge with defaults
  const config = deepMerge(DEFAULTS, raw);
  return config;
}

module.exports = { loadConfig, deepMerge, coerceValue, resolveProviderName, DEFAULTS };
