"use strict";

/**
 * Model registry — curated catalog + live API discovery.
 *
 * Each entry: { id, display, provider, tier, context_window, max_output,
 *   reasoning: { supported, param?, values? }, release_date }
 */

const CATALOG = [
  // ══ Anthropic — 2026-08 ══
  // 5th gen: adaptive thinking + effort
  { id: "claude-fable-5", display: "Claude Fable 5", provider: "anthropic", tier: "frontier", context_window: 200000, max_output: 32000, release_date: "2026-06-09", reasoning: { supported: true, param: "thinking", effort_param: "effort", values: ["adaptive"], effort_values: ["low", "medium", "high"] } },
  { id: "claude-opus-5", display: "Claude Opus 5", provider: "anthropic", tier: "flagship", context_window: 200000, max_output: 32000, release_date: "2026-06-09", reasoning: { supported: true, param: "thinking", effort_param: "effort", values: ["adaptive"], effort_values: ["low", "medium", "high"] } },
  { id: "claude-sonnet-5", display: "Claude Sonnet 5", provider: "anthropic", tier: "balanced", context_window: 200000, max_output: 16000, release_date: "2026-06-09", reasoning: { supported: true, param: "thinking", effort_param: "effort", values: ["adaptive"], effort_values: ["low", "medium", "high"] } },
  { id: "claude-haiku-4-5-20251001", display: "Claude Haiku 4.5", provider: "anthropic", tier: "fast", context_window: 200000, max_output: 8192, release_date: "2025-10-01", reasoning: { supported: false } },
  // 4.x legacy
  { id: "claude-opus-4-8", display: "Opus 4.8 (L)", provider: "anthropic", tier: "flagship", context_window: 200000, max_output: 32000, release_date: "2025-09-01", reasoning: { supported: true, param: "thinking", effort_param: "effort", values: ["adaptive"], effort_values: ["low", "medium", "high"] } },
  { id: "claude-opus-4-7", display: "Opus 4.7 (L)", provider: "anthropic", tier: "flagship", context_window: 200000, max_output: 32000, release_date: "2025-06-01", reasoning: { supported: true, param: "thinking", effort_param: "effort", values: ["adaptive"], effort_values: ["low", "medium", "high"] } },
  { id: "claude-opus-4-6", display: "Opus 4.6 (L)", provider: "anthropic", tier: "flagship", context_window: 200000, max_output: 32000, release_date: "2025-03-01", reasoning: { supported: true, param: "thinking", values: ["enabled", "budget_tokens"] } },
  { id: "claude-sonnet-4-6", display: "Sonnet 4.6 (L)", provider: "anthropic", tier: "balanced", context_window: 200000, max_output: 16000, release_date: "2025-03-01", reasoning: { supported: true, param: "thinking", values: ["enabled", "budget_tokens"] } },
  { id: "claude-sonnet-4-5-20250514", display: "Sonnet 4.5 (L)", provider: "anthropic", tier: "balanced", context_window: 200000, max_output: 16000, release_date: "2025-05-14", reasoning: { supported: true, param: "thinking", values: ["enabled", "budget_tokens"] } },
  { id: "claude-sonnet-4-20250514", display: "Sonnet 4 (L)", provider: "anthropic", tier: "balanced", context_window: 200000, max_output: 16000, release_date: "2025-05-14", reasoning: { supported: true, param: "thinking", values: ["enabled", "budget_tokens"] } },
  { id: "claude-3-5-sonnet-20241022", display: "3.5 Sonnet v2 (L)", provider: "anthropic", tier: "balanced", context_window: 200000, max_output: 8192, release_date: "2024-10-22", reasoning: { supported: false } },
  { id: "claude-3-5-haiku-20241022", display: "3.5 Haiku (L)", provider: "anthropic", tier: "fast", context_window: 200000, max_output: 8192, release_date: "2024-10-22", reasoning: { supported: false } },

  // ══ OpenAI — 2026-08 ══
  // GPT-5.6 generation — reasoning_effort 6 levels
  { id: "gpt-5.6-sol", display: "GPT-5.6 Sol", provider: "openai", tier: "frontier", context_window: 1050000, max_output: 128000, release_date: "2026-02-16", reasoning: { supported: true, param: "reasoning_effort", values: ["none", "low", "medium", "high", "xhigh", "max"] } },
  { id: "gpt-5.6-terra", display: "GPT-5.6 Terra", provider: "openai", tier: "flagship", context_window: 1050000, max_output: 128000, release_date: "2026-02-16", reasoning: { supported: true, param: "reasoning_effort", values: ["none", "low", "medium", "high", "xhigh", "max"] } },
  { id: "gpt-5.6-luna", display: "GPT-5.6 Luna", provider: "openai", tier: "balanced", context_window: 1050000, max_output: 128000, release_date: "2026-02-16", reasoning: { supported: true, param: "reasoning_effort", values: ["none", "low", "medium", "high", "xhigh", "max"] } },
  { id: "gpt-5.6", display: "GPT-5.6 (→Sol)", provider: "openai", tier: "frontier", context_window: 1050000, max_output: 128000, release_date: "2026-02-16", reasoning: { supported: true, param: "reasoning_effort", values: ["none", "low", "medium", "high", "xhigh", "max"] } },
  // o-series
  { id: "o4-mini", display: "o4-mini", provider: "openai", tier: "reasoning", context_window: 200000, max_output: 100000, release_date: "2025-04-16", reasoning: { supported: true, param: "reasoning_effort", values: ["low", "medium", "high"] } },
  { id: "o3", display: "o3", provider: "openai", tier: "reasoning", context_window: 200000, max_output: 100000, release_date: "2025-04-16", reasoning: { supported: true, param: "reasoning_effort", values: ["low", "medium", "high"] } },
  { id: "o3-mini", display: "o3-mini", provider: "openai", tier: "reasoning", context_window: 200000, max_output: 100000, release_date: "2025-01-31", reasoning: { supported: true, param: "reasoning_effort", values: ["low", "medium", "high"] } },
  { id: "o1", display: "o1", provider: "openai", tier: "reasoning", context_window: 200000, max_output: 100000, release_date: "2024-12-17", reasoning: { supported: true, param: "reasoning_effort", values: ["low", "medium", "high"] } },
  // GPT-4.1 generation
  { id: "gpt-4.1", display: "GPT-4.1", provider: "openai", tier: "balanced", context_window: 1047576, max_output: 32768, release_date: "2025-04-14", reasoning: { supported: false } },
  { id: "gpt-4.1-mini", display: "GPT-4.1 mini", provider: "openai", tier: "fast", context_window: 1047576, max_output: 32768, release_date: "2025-04-14", reasoning: { supported: false } },
  { id: "gpt-4.1-nano", display: "GPT-4.1 nano", provider: "openai", tier: "fast", context_window: 1047576, max_output: 32768, release_date: "2025-04-14", reasoning: { supported: false } },
  // Legacy
  { id: "gpt-4o", display: "GPT-4o (L)", provider: "openai", tier: "flagship", context_window: 128000, max_output: 16384, release_date: "2024-05-13", reasoning: { supported: false } },
  { id: "gpt-4o-mini", display: "GPT-4o mini (L)", provider: "openai", tier: "fast", context_window: 128000, max_output: 16384, release_date: "2024-07-18", reasoning: { supported: false } },

  // ══ Google Gemini — 2026-08 ══
  // Gemini 3.x generation
  { id: "gemini-3.7-flash", display: "Gemini 3.7 Flash", provider: "google", tier: "balanced", context_window: 1048576, max_output: 65536, release_date: "2026-07-01", reasoning: { supported: true, param: "thinkingConfig", values: ["none", "dynamic", "budget"] } },
  { id: "gemini-3.6-flash", display: "Gemini 3.6 Flash", provider: "google", tier: "balanced", context_window: 1048576, max_output: 65536, release_date: "2026-05-01", reasoning: { supported: true, param: "thinkingConfig", values: ["none", "dynamic", "budget"] } },
  { id: "gemini-3.5-flash", display: "Gemini 3.5 Flash", provider: "google", tier: "fast", context_window: 1048576, max_output: 65536, release_date: "2026-03-01", reasoning: { supported: true, param: "thinkingConfig", values: ["none", "dynamic", "budget"] } },
  { id: "gemini-3.5-flash-lite", display: "Gemini 3.5 Flash-Lite", provider: "google", tier: "fast", context_window: 1048576, max_output: 8192, release_date: "2026-03-01", reasoning: { supported: false } },
  { id: "gemini-3.1-flash-lite", display: "Gemini 3.1 Flash-Lite", provider: "google", tier: "fast", context_window: 1048576, max_output: 8192, release_date: "2026-01-01", reasoning: { supported: false } },
  { id: "gemini-3.1-pro", display: "Gemini 3.1 Pro", provider: "google", tier: "flagship", context_window: 1048576, max_output: 65536, release_date: "2026-01-01", reasoning: { supported: true, param: "thinkingConfig", values: ["none", "dynamic", "budget"] } },
  // Gemini 2.x (previous)
  { id: "gemini-2.5-pro", display: "Gemini 2.5 Pro (prev)", provider: "google", tier: "flagship", context_window: 1048576, max_output: 65536, release_date: "2025-03-25", reasoning: { supported: true, param: "thinkingConfig", values: ["none", "dynamic", "budget"] } },
  { id: "gemini-2.5-flash", display: "Gemini 2.5 Flash (prev)", provider: "google", tier: "balanced", context_window: 1048576, max_output: 65536, release_date: "2025-04-09", reasoning: { supported: true, param: "thinkingConfig", values: ["none", "dynamic", "budget"] } },
  // Deprecated (shut down)
  { id: "gemini-2.0-flash", display: "⚠️ 2.0 Flash (SHUT DOWN)", provider: "google", tier: "deprecated", context_window: 1048576, max_output: 8192, release_date: "2025-02-05", reasoning: { supported: false } },
  { id: "gemini-2.0-flash-lite", display: "⚠️ 2.0 Flash-Lite (SHUT DOWN)", provider: "google", tier: "deprecated", context_window: 1048576, max_output: 8192, release_date: "2025-02-05", reasoning: { supported: false } },
];

function listModels(providerFilter) {
  return providerFilter ? CATALOG.filter(m => m.provider === providerFilter.toLowerCase()) : [...CATALOG];
}

function findModel(modelId) {
  return CATALOG.find(m => m.id === modelId);
}

/** Fetch model IDs from OpenAI-compatible /v1/models */
async function fetchOpenAIModels(baseUrl, apiKey) {
  const { fetchWithTimeout } = require("./provider");
  try {
    const res = await fetchWithTimeout(`${baseUrl}/v1/models`, { headers: { Authorization: `Bearer ${apiKey}` } }, 10000);
    if (!res.ok) return [];
    const data = await res.json();
    return (data.data || []).map(m => m.id).sort();
  } catch { return []; }
}

/** Fetch model IDs from Google /v1beta/models */
async function fetchGoogleModels(baseUrl, apiKey) {
  const { fetchWithTimeout } = require("./provider");
  try {
    const res = await fetchWithTimeout(`${baseUrl}/v1beta/models?key=${apiKey}`, {}, 10000);
    if (!res.ok) return [];
    const data = await res.json();
    return (data.models || []).map(m => m.name?.replace("models/", "")).filter(Boolean).sort();
  } catch { return []; }
}

/** Discover live models from all configured providers + merge with catalog */
async function discoverModels(providers) {
  const result = { catalog: [...CATALOG], live: {}, unknown: [], custom: [] };

  if (providers.openai?.api_key) {
    const base = providers.openai.endpoint || "https://api.openai.com";
    const liveIds = await fetchOpenAIModels(base, providers.openai.api_key);
    result.live.openai = liveIds;
    const catIds = new Set(CATALOG.filter(m => m.provider === "openai").map(m => m.id));
    result.unknown.push(...liveIds.filter(id => !catIds.has(id)));
  }

  if (providers.google?.api_key || providers.gemini?.api_key) {
    const cfg = providers.google || providers.gemini;
    const base = cfg.endpoint || "https://generativelanguage.googleapis.com";
    const liveIds = await fetchGoogleModels(base, cfg.api_key);
    result.live.google = liveIds;
    const catIds = new Set(CATALOG.filter(m => m.provider === "google").map(m => m.id));
    result.unknown.push(...liveIds.filter(id => !catIds.has(id)));
  }

  // Anthropic has no models list API
  result.live.anthropic = CATALOG.filter(m => m.provider === "anthropic").map(m => m.id);

  // Tier 2: OpenRouter live discovery
  if (providers.openrouter?.api_key) {
    try {
      const { OpenRouterProvider } = require("./provider");
      const liveModels = await OpenRouterProvider.fetchModels(providers.openrouter.api_key);
      result.live.openrouter = liveModels;
      result.openrouter_count = liveModels.length;
    } catch { result.live.openrouter = []; }
  }

  // Tier 3: Custom providers (user-defined models + live discovery)
  for (const [name, cfg] of Object.entries(providers)) {
    if (cfg.base_url || cfg.models) {
      const customModels = [];
      // User-defined models from config
      if (cfg.models) {
        for (const m of cfg.models) {
          customModels.push({ id: m.id, display: m.display || m.id, context_window: m.context_window || null, max_output: m.max_output || null, reasoning: { supported: m.reasoning || false } });
        }
      }
      // Live discovery from endpoint
      try {
        const { CustomProvider } = require("./provider");
        const live = await CustomProvider.fetchModels(cfg.base_url, cfg.api_key);
        for (const l of live) {
          if (!customModels.find(m => m.id === l.id)) customModels.push(l);
        }
      } catch {}
      if (customModels.length > 0) {
        result.custom.push({ provider: name, base_url: cfg.base_url, models: customModels });
      }
    }
  }

  return result;
}

/** Format a model entry for CLI display */
function formatModel(m) {
  let reasoning = "";
  if (m.reasoning?.supported) {
    const param = m.reasoning.param;
    if (m.reasoning.effort_param) {
      reasoning = ` 🧠 ${m.reasoning.effort_param}(${m.reasoning.effort_values.join("|")})`;
    } else if (param === "reasoning_effort") {
      reasoning = ` 🧠 ${param}(${m.reasoning.values.join("|")})`;
    } else if (param === "thinkingConfig") {
      reasoning = ` 🧠 ${param}(${m.reasoning.values.join("|")})`;
    } else {
      reasoning = ` 🧠 ${param}`;
    }
  }
  const ctx = m.context_window >= 1000000 ? `${(m.context_window / 1048576).toFixed(1)}M` : `${(m.context_window / 1000).toFixed(0)}K`;
  const out = m.max_output >= 1000 ? `${(m.max_output / 1000).toFixed(0)}K` : `${m.max_output}`;
  return `  ${m.id.padEnd(32)} ${m.display.padEnd(24)} [${ctx} in, ${out} out]${reasoning}`;
}

module.exports = { CATALOG, listModels, findModel, fetchOpenAIModels, fetchGoogleModels, discoverModels, formatModel };