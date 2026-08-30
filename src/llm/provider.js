"use strict";

const FETCH_TIMEOUT_MS = 300000; // Allow slow reasoning providers up to five minutes
const MAX_RESPONSE_BYTES = 2 * 1024 * 1024; // 2 MB max response body

const { authManager, ALIAS_MAP } = require("../auth");

class LLMProvider {
  constructor(name, config = {}) {
    this.name = name;
    this.config = config;
    this._authManager = authManager;
  }
  async complete(messages, options = {}) {
    throw new Error(`${this.name}.complete() not implemented`);
  }
  isAvailable() { return false; }
  /** Resolve auth headers using the auth module. */
  async _resolveAuth() {
    return this._authManager.resolve(this.name, this.config);
  }
}

/**
 * Fetch with timeout and response size limit to prevent memory exhaustion.
 */
async function fetchWithTimeout(url, opts = {}, timeoutMs = FETCH_TIMEOUT_MS) {
  const attempts = opts.retry_network_errors === false ? 1 : 5;
  const requestOpts = { ...opts };
  delete requestOpts.retry_network_errors;
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, { ...requestOpts, signal: controller.signal });
      const contentLength = parseInt(res.headers.get("content-length") || "0", 10);
      if (contentLength > MAX_RESPONSE_BYTES) throw new Error(`Response too large: ${contentLength} bytes (max ${MAX_RESPONSE_BYTES})`);
      return res;
    } catch (error) {
      lastError = error;
      const networkFailure = error?.name === "TypeError" || /ECONNRESET|ECONNREFUSED|UND_ERR|fetch failed/i.test(error?.message || "");
      if (!networkFailure || attempt === attempts) throw error;
      await new Promise(resolve => setTimeout(resolve, 250 * attempt));
    } finally {
      clearTimeout(timer);
    }
  }
  throw lastError;
}

class AnthropicProvider extends LLMProvider {
  constructor(config = {}) {
    super("anthropic", config);
    this.apiKey = config.api_key || process.env.ANTHROPIC_API_KEY || "";
    this.baseUrl = config.endpoint || "https://api.anthropic.com";
  }
  async isAvailable() {
    try {
      const { token } = await this._resolveAuth();
      return Boolean(token || this.apiKey);
    } catch { return Boolean(this.apiKey); }
  }
  async complete(messages, options = {}) {
    const auth = await this._resolveAuth();
    const apiKey = this.apiKey || auth.token || "";
    if (!apiKey) throw new Error("Anthropic: no credentials (set api_key or auth block)");
    const model = options.model || this.config.model || "claude-sonnet-5";
    const systemMsg = messages.find((m) => m.role === "system");
    const nonSystem = messages.filter((m) => m.role !== "system");
    const body = {
      model, max_tokens: options.max_tokens || 4096,
      messages: nonSystem.map((m) => ({ role: m.role, content: m.content })),
    };
    if (systemMsg) body.system = systemMsg.content;

    // 🧠 Thinking support
    const thinking = options.thinking || this.config.thinking;
    const effort = options.effort || this.config.effort;
    if (thinking === "adaptive" || thinking === "enabled") {
      if (thinking === "adaptive" || /^(claude-(fable|opus|sonnet)-5|claude-opus-4-[78]|claude-sonnet-4-6|claude-sonnet-5)/.test(model)) {
        body.thinking = { type: "adaptive" };
        if (effort) body.output_config = { effort };
      } else {
        const budget = options.thinking_budget || this.config.thinking_budget || 10000;
        body.thinking = { type: "enabled", budget_tokens: budget };
      }
      if (body.max_tokens < 16000) body.max_tokens = 16000;
    }

    const headers = { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" };
    const res = await fetchWithTimeout(`${this.baseUrl}/v1/messages`, { method: "POST", headers, body: JSON.stringify(body) });
    if (!res.ok) throw new Error(`Anthropic API error ${res.status}: ${await res.text()}`);
    const data = await res.json();
    const textBlocks = (data.content || []).filter(b => b.type === "text");
    return { text: textBlocks.map((b) => b.text).join("") || "", model: data.model, usage: data.usage || {}, tokens: _countTokens(data.usage) };
  }
}

class OpenAIProvider extends LLMProvider {
  constructor(config = {}) {
    super("openai", config);
    this.apiKey = config.api_key || process.env.OPENAI_API_KEY || "";
    this.baseUrl = config.endpoint || "https://api.openai.com";
  }
  async isAvailable() {
    try { const { token } = await this._resolveAuth(); return Boolean(token || this.apiKey); }
    catch { return Boolean(this.apiKey); }
  }
  async complete(messages, options = {}) {
    const auth = await this._resolveAuth();
    const apiKey = this.apiKey || auth.token || "";
    if (!apiKey) throw new Error("OpenAI: no credentials (set api_key or auth block)");
    const model = options.model || this.config.model || "gpt-5.6-terra";
    const body = { model, messages, max_tokens: options.max_tokens || 4096, temperature: options.temperature ?? 0.7 };

    // 🧠 Reasoning effort support (o1, o3, o4-mini)
    const reasoningEffort = options.reasoning_effort || this.config.reasoning_effort;
    if (reasoningEffort && /^(o1|o3|o4)/.test(model)) {
      body.reasoning_effort = reasoningEffort;
      // Reasoning models: omit temperature (not supported)
      delete body.temperature;
    }

    const res = await fetchWithTimeout(`${this.baseUrl}/v1/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer " + apiKey },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`OpenAI API error ${res.status}: ${await res.text()}`);
    const data = await res.json();
    return { text: data.choices?.[0]?.message?.content || "", model: data.model, usage: data.usage || {}, tokens: _countTokens(data.usage) };
  }
}

class GoogleProvider extends LLMProvider {
  constructor(config = {}) {
    super("google", config);
    this.apiKey = config.api_key || process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY || "";
    this.baseUrl = config.endpoint || "https://generativelanguage.googleapis.com";
  }
  async isAvailable() {
    try { const { token } = await this._resolveAuth(); return Boolean(token || this.apiKey); }
    catch { return Boolean(this.apiKey); }
  }
  async complete(messages, options = {}) {
    const auth = await this._resolveAuth();
    const apiKey = this.apiKey || auth.token || "";
    if (!apiKey) throw new Error("Google: no credentials (set api_key or auth block)");
    const model = options.model || this.config.model || "gemini-3.7-flash";
    const systemMsg = messages.find((m) => m.role === "system");
    const nonSystem = messages.filter((m) => m.role !== "system");
    const contents = nonSystem.map((m) => ({ role: m.role === "assistant" ? "model" : "user", parts: [{ text: m.content }] }));
    const body = { contents };
    if (systemMsg) body.systemInstruction = { parts: [{ text: systemMsg.content }] };

    // 🧠 Thinking support (Gemini 2.5 Pro / Flash)
    const thinking = options.thinking || this.config.thinking;
    if (thinking && thinking !== "none") {
      body.generationConfig = body.generationConfig || {};
      if (thinking === "dynamic") {
        body.generationConfig.thinkingConfig = { includeThoughts: true };
      } else if (thinking === "budget" || (typeof thinking === "object" && thinking.budget_tokens)) {
        const budget = typeof thinking === "object" ? thinking.budget_tokens : (this.config.thinking_budget || 10000);
        body.generationConfig.thinkingConfig = { includeThoughts: true, thinkingBudget: budget };
      }
    }

    const res = await fetchWithTimeout(`${this.baseUrl}/v1beta/models/${model}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`Google API error ${res.status}: ${await res.text()}`);
    const data = await res.json();
    // Filter out thought parts from candidates
    const parts = data.candidates?.[0]?.content?.parts || [];
    const textParts = parts.filter(p => !p.thought);
    return { text: textParts.map((p) => p.text).join("") || "", model, usage: data.usageMetadata || {}, tokens: _countTokens(data.usageMetadata) };
  }
}

/**
 * Extract token counts from any provider's usage metadata.
 * Returns { input: number, output: number } with accurate counts from the API.
 */
function _countTokens(u) {
  if (!u) return { input: 0, output: 0 };
  // Anthropic: input_tokens, output_tokens
  if (u.input_tokens !== undefined || u.output_tokens !== undefined) {
    return { input: u.input_tokens || 0, output: u.output_tokens || 0 };
  }
  // OpenAI: prompt_tokens, completion_tokens
  if (u.prompt_tokens !== undefined || u.completion_tokens !== undefined) {
    return { input: u.prompt_tokens || 0, output: u.completion_tokens || 0 };
  }
  // Google: promptTokenCount, candidatesTokenCount
  if (u.promptTokenCount !== undefined || u.candidatesTokenCount !== undefined) {
    return { input: u.promptTokenCount || 0, output: u.candidatesTokenCount || 0 };
  }
  return { input: 0, output: 0 };
}

/**
 * OpenRouter provider — routes through openrouter.ai.
 * Model IDs use "provider/model" format (e.g. "anthropic/claude-sonnet-5").
 */
class OpenRouterProvider extends LLMProvider {
  constructor(config = {}) {
    super("openrouter", config);
    this.apiKey = config.api_key || process.env.OPENROUTER_API_KEY || "";
    this.baseUrl = (config.endpoint || "https://openrouter.ai/api").replace(/\/+$/, "");
  }
  async isAvailable() {
    try { const { token } = await this._resolveAuth(); return Boolean(token || this.apiKey); }
    catch { return Boolean(this.apiKey); }
  }
  async complete(messages, options = {}) {
    const auth = await this._resolveAuth();
    const apiKey = this.apiKey || auth.token || "";
    if (!apiKey) throw new Error("OpenRouter: no credentials");
    const model = options.model || this.config.model || "anthropic/claude-sonnet-5";
    const body = { model, messages: messages.map(m => ({ role: m.role, content: m.content })), max_tokens: options.max_tokens || 4096 };
    const effort = options.reasoning_effort || options.effort || this.config.effort;
    if (effort) body.reasoning_effort = effort;
    const headers = { "Content-Type": "application/json", Authorization: "Bearer " + apiKey, "HTTP-Referer": "https://github.com/minitok/minitok", "X-Title": "minitok" };
    const res = await fetchWithTimeout(`${this.baseUrl}/v1/chat/completions`, { method: "POST", headers, body: JSON.stringify(body) });
    if (!res.ok) throw new Error(`OpenRouter error ${res.status}: ${await res.text()}`);
    const data = await res.json();
    return { text: data.choices?.[0]?.message?.content || "", model: data.model, usage: data.usage || {}, tokens: _countTokens(data.usage) };
  }
  static async fetchModels(apiKey) {
    if (!apiKey) return [];
    try {
      const res = await fetchWithTimeout("https://openrouter.ai/api/v1/models", { headers: { Authorization: "Bearer " + apiKey } }, 15000);
      if (!res.ok) return [];
      const data = await res.json();
      return (data.data || []).map(m => ({ id: m.id, display: m.name || m.id, context_window: m.context_length || 128000, max_output: m.top_provider?.max_completion_tokens || null, pricing: m.pricing || null, supported_parameters: m.supported_parameters || [] }));
    } catch { return []; }
  }
}

/**
 * Custom provider — generic OpenAI-compatible endpoint.
 * Used for Ollama, vLLM, LiteLLM, Bedrock proxies, enterprise LLMs, etc.
 */
class CustomProvider extends LLMProvider {
  constructor(config = {}) {
    super(config._name || "custom", config);
    this.apiKey = config.api_key || "";
    this.baseUrl = (config.base_url || "").replace(/\/+$/, "");
    this.models = config.models || [];
  }
  async isAvailable() { return Boolean(this.baseUrl); }
  async complete(messages, options = {}) {
    if (!this.baseUrl) throw new Error(`${this.name}: base_url not configured`);
    const auth = await this._resolveAuth();
    const apiKey = this.apiKey || auth.token || "";
    const model = options.model || this.config.model || (this.models[0]?.id) || "default";
    const body = { model, messages: messages.map(m => ({ role: m.role, content: m.content })), max_tokens: options.max_tokens || 4096 };
    const headers = { "Content-Type": "application/json", ...(auth.headers || {}) };
    if (apiKey && !headers.Authorization && !headers["x-api-key"]) {
      const scheme = this.config.auth?.scheme || "Bearer";
      const header = this.config.auth?.header || "Authorization";
      headers[header] = scheme === "raw" ? apiKey : `${scheme} ${apiKey}`;
    }
    const apiPath = this.baseUrl.endsWith("/v1") ? "/chat/completions" : "/v1/chat/completions";
    const res = await fetchWithTimeout(`${this.baseUrl}${apiPath}`, { method: "POST", headers, body: JSON.stringify(body) });
    if (!res.ok) throw new Error(`${this.name} error ${res.status}: ${await res.text()}`);
    const data = await res.json();
    return { text: data.choices?.[0]?.message?.content || "", model: data.model || model, usage: data.usage || {}, tokens: _countTokens(data.usage) };
  }
  static async fetchModels(baseUrl, apiKey) {
    if (!baseUrl) return [];
    try {
      const headers = apiKey ? { Authorization: "Bearer " + apiKey } : {};
      const res = await fetchWithTimeout(`${baseUrl.replace(/\/+$/, "")}/v1/models`, { headers }, 10000);
      if (!res.ok) return [];
      const data = await res.json();
      return (data.data || []).map(m => ({ id: m.id, display: m.id, context_window: m.context_length || null, max_output: null }));
    } catch { return []; }
  }
}

function createProvider(name, config = {}) {
  const n = name.toLowerCase();
  // Tier 1: Direct providers
  switch (n) {
    case "anthropic": case "claude": return new AnthropicProvider(config);
    case "openai": case "gpt": return new OpenAIProvider(config);
    case "google": case "gemini": return new GoogleProvider(config);
    case "openrouter": return new OpenRouterProvider(config);
  }
  // Tier 2/3: Custom provider (has base_url or models array)
  if (config.base_url || config.endpoint || config.models) {
    return new CustomProvider({ ...config, base_url: config.base_url || config.endpoint, _name: n });
  }
  throw new Error(`Unknown LLM provider: ${name}. Set base_url for custom providers.`);
}

async function detectAvailableProviders(config) {
  const p = [];
  if (await new AnthropicProvider(config.providers?.anthropic || {}).isAvailable()) p.push("anthropic");
  if (await new OpenAIProvider(config.providers?.openai || {}).isAvailable()) p.push("openai");
  if (await new GoogleProvider(config.providers?.google || config.providers?.gemini || {}).isAvailable()) p.push("google");
  if (await new OpenRouterProvider(config.providers?.openrouter || {}).isAvailable()) p.push("openrouter");
  // Tier 3: detect custom providers with base_url
  for (const [name, cfg] of Object.entries(config.providers || {})) {
    if (cfg.base_url && !p.includes(name)) {
      try { if (await new CustomProvider({ ...cfg, _name: name }).isAvailable()) p.push(name); } catch {}
    }
  }
  return p;
}

module.exports = { LLMProvider, AnthropicProvider, OpenAIProvider, GoogleProvider, OpenRouterProvider, CustomProvider, createProvider, detectAvailableProviders, fetchWithTimeout, _countTokens };

