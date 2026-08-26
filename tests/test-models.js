"use strict";

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");

describe("Models", () => {
  it("catalog has 3 providers", () => {
    const { CATALOG, listModels } = require("../src/llm/models");
    const providers = [...new Set(CATALOG.map(m => m.provider))];
    assert.deepEqual(providers.sort(), ["anthropic", "google", "openai"]);
  });

  it("filter by provider", () => {
    const { listModels } = require("../src/llm/models");
    assert.equal(listModels("anthropic").every(m => m.provider === "anthropic"), true);
    assert.equal(listModels("openai").every(m => m.provider === "openai"), true);
    assert.equal(listModels("google").every(m => m.provider === "google"), true);
  });

  it("findModel returns entry", () => {
    const { findModel } = require("../src/llm/models");
    const m = findModel("o3");
    assert.ok(m);
    assert.equal(m.reasoning.supported, true);
    assert.deepEqual(m.reasoning.values, ["low", "medium", "high"]);
  });

  it("findModel returns undefined for unknown", () => {
    const { findModel } = require("../src/llm/models");
    assert.equal(findModel("nonexistent"), undefined);
  });

  it("reasoning models have correct params", () => {
    const { listModels } = require("../src/llm/models");
    const reasoning = listModels().filter(m => m.reasoning.supported);
    assert.ok(reasoning.length >= 6, "Should have at least 6 reasoning models");

    // Anthropic uses "thinking" param
    const anthReasoning = reasoning.filter(m => m.provider === "anthropic");
    assert.ok(anthReasoning.every(m => m.reasoning.param === "thinking"));

    // OpenAI uses "reasoning_effort" param
    const oaiReasoning = reasoning.filter(m => m.provider === "openai");
    assert.ok(oaiReasoning.every(m => m.reasoning.param === "reasoning_effort"));

    // Google uses "thinkingConfig" param
    const ggReasoning = reasoning.filter(m => m.provider === "google");
    assert.ok(ggReasoning.every(m => m.reasoning.param === "thinkingConfig"));
  });

  it("formatModel includes reasoning icon", () => {
    const { findModel, formatModel } = require("../src/llm/models");
    const o3 = findModel("o3");
    const formatted = formatModel(o3);
    assert.ok(formatted.includes("🧠"), "Should include reasoning icon");
    assert.ok(formatted.includes("reasoning_effort"), "Should show param name");
  });

  it("formatModel omits icon for non-reasoning", () => {
    const { findModel, formatModel } = require("../src/llm/models");
    const haiku = findModel("claude-3-5-haiku-20241022");
    const formatted = formatModel(haiku);
    assert.ok(!formatted.includes("🧠"), "Should not include reasoning icon");
  });

  it("fetchOpenAIModels returns array", async () => {
    const { fetchOpenAIModels } = require("../src/llm/models");
    // No API key = empty array, should not throw
    const result = await fetchOpenAIModels("https://api.openai.com", "");
    assert.ok(Array.isArray(result));
  });

  it("fetchGoogleModels returns array", async () => {
    const { fetchGoogleModels } = require("../src/llm/models");
    const result = await fetchGoogleModels("https://generativelanguage.googleapis.com", "");
    assert.ok(Array.isArray(result));
  });

  it("discoverModels returns structure", async () => {
    const { discoverModels } = require("../src/llm/models");
    const result = await discoverModels({});
    assert.ok(result.catalog.length > 0);
    assert.ok(result.live);
    assert.ok(Array.isArray(result.unknown));
  });
});

describe("Reasoning in Provider", () => {
  it("AnthropicProvider accepts thinking option", () => {
    const { AnthropicProvider } = require("../src/llm/provider");
    const p = new AnthropicProvider({ api_key: "test", thinking: "enabled" });
    assert.equal(p.config.thinking, "enabled");
  });

  it("OpenAIProvider accepts reasoning_effort option", () => {
    const { OpenAIProvider } = require("../src/llm/provider");
    const p = new OpenAIProvider({ api_key: "test", reasoning_effort: "high" });
    assert.equal(p.config.reasoning_effort, "high");
  });

  it("GoogleProvider accepts thinking option", () => {
    const { GoogleProvider } = require("../src/llm/provider");
    const p = new GoogleProvider({ api_key: "test", thinking: "dynamic", thinking_budget: 5000 });
    assert.equal(p.config.thinking, "dynamic");
    assert.equal(p.config.thinking_budget, 5000);
  });

  it("_countTokens handles all providers", () => {
    const { _countTokens } = require("../src/llm/provider");
    // Anthropic format
    assert.deepEqual(_countTokens({ input_tokens: 100, output_tokens: 50 }), { input: 100, output: 50 });
    // OpenAI format
    assert.deepEqual(_countTokens({ prompt_tokens: 200, completion_tokens: 80 }), { input: 200, output: 80 });
    // Google format
    assert.deepEqual(_countTokens({ promptTokenCount: 300, candidatesTokenCount: 120 }), { input: 300, output: 120 });
    // null
    assert.deepEqual(_countTokens(null), { input: 0, output: 0 });
  });
});
