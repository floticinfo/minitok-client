"use strict";

/**
 * Tests for OpenRouter + Custom providers (Tier 2/3).
 */

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");

describe("OpenRouter Provider", () => {
  it("creates with config", () => {
    const { createProvider } = require("../src/llm/provider");
    const p = createProvider("openrouter", { api_key: "sk-or-test" });
    assert.equal(p.name, "openrouter");
    assert.equal(p.apiKey, "sk-or-test");
  });

  it("creates from env var", async () => {
    process.env.OPENROUTER_API_KEY = "sk-or-env";
    const { createProvider } = require("../src/llm/provider");
    const p = createProvider("openrouter", {});
    assert.equal(await p.isAvailable(), true);
    delete process.env.OPENROUTER_API_KEY;
  });

  it("isAvailable false without key", async () => {
    const { createProvider } = require("../src/llm/provider");
    const p = createProvider("openrouter", {});
    assert.equal(await p.isAvailable(), false);
  });

  it("sets custom endpoint", () => {
    const { createProvider } = require("../src/llm/provider");
    const p = createProvider("openrouter", { api_key: "k", endpoint: "https://custom.router.com/api" });
    assert.equal(p.baseUrl, "https://custom.router.com/api");
  });

  it("strips trailing slash from baseUrl", () => {
    const { OpenRouterProvider } = require("../src/llm/provider");
    const p = new OpenRouterProvider({ api_key: "k", endpoint: "https://api.test.com/" });
    assert.equal(p.baseUrl, "https://api.test.com");
  });

  it("fetchModels returns empty without key", async () => {
    const { OpenRouterProvider } = require("../src/llm/provider");
    const models = await OpenRouterProvider.fetchModels("");
    assert.deepEqual(models, []);
  });
});

describe("Custom Provider", () => {
  it("creates with base_url", () => {
    const { createProvider } = require("../src/llm/provider");
    const p = createProvider("ollama", { base_url: "http://localhost:11434/v1" });
    assert.equal(p.name, "ollama");
    assert.equal(p.baseUrl, "http://localhost:11434/v1");
  });

  it("creates with models array", () => {
    const { createProvider } = require("../src/llm/provider");
    const p = createProvider("bedrock", {
      base_url: "https://proxy.internal/v1",
      models: [
        { id: "claude-sonnet-5", display: "Claude Sonnet 5", context_window: 200000 },
      ],
    });
    assert.equal(p.name, "bedrock");
    assert.equal(p.models.length, 1);
    assert.equal(p.models[0].id, "claude-sonnet-5");
  });

  it("isAvailable with base_url", async () => {
    const { createProvider } = require("../src/llm/provider");
    const p = createProvider("ollama", { base_url: "http://localhost:11434/v1" });
    assert.equal(await p.isAvailable(), true);
  });

  it("isAvailable false without base_url", async () => {
    const { CustomProvider } = require("../src/llm/provider");
    const p = new CustomProvider({});
    assert.equal(await p.isAvailable(), false);
  });

  it("strips trailing slashes", () => {
    const { CustomProvider } = require("../src/llm/provider");
    const p = new CustomProvider({ base_url: "http://localhost:8080///" });
    assert.equal(p.baseUrl, "http://localhost:8080");
  });

  it("fetchModels returns empty without url", async () => {
    const { CustomProvider } = require("../src/llm/provider");
    const models = await CustomProvider.fetchModels("");
    assert.deepEqual(models, []);
  });
});

describe("createProvider tier routing", () => {
  it("tier 1: anthropic", () => {
    const { createProvider } = require("../src/llm/provider");
    const p = createProvider("anthropic", { api_key: "k" });
    assert.equal(p.constructor.name, "AnthropicProvider");
  });

  it("tier 1: openrouter", () => {
    const { createProvider } = require("../src/llm/provider");
    const p = createProvider("openrouter", { api_key: "k" });
    assert.equal(p.constructor.name, "OpenRouterProvider");
  });

  it("tier 3: custom via base_url", () => {
    const { createProvider } = require("../src/llm/provider");
    const p = createProvider("ollama", { base_url: "http://localhost:11434/v1" });
    assert.equal(p.constructor.name, "CustomProvider");
  });

  it("tier 3: custom via models", () => {
    const { createProvider } = require("../src/llm/provider");
    const p = createProvider("myllm", { models: [{ id: "m1" }] });
    assert.equal(p.constructor.name, "CustomProvider");
  });

  it("throws for unknown without base_url", () => {
    const { createProvider } = require("../src/llm/provider");
    assert.throws(() => createProvider("unknown"), /Unknown|Set base_url/);
  });
});

describe("detectAvailableProviders with custom", () => {
  it("detects openrouter", async () => {
    const { detectAvailableProviders } = require("../src/llm/provider");
    const p = await detectAvailableProviders({ providers: { openrouter: { api_key: "k" } } });
    assert.ok(p.includes("openrouter"));
  });

  it("detects custom provider", async () => {
    const { detectAvailableProviders } = require("../src/llm/provider");
    const p = await detectAvailableProviders({ providers: { ollama: { base_url: "http://localhost:11434/v1" } } });
    assert.ok(p.includes("ollama"));
  });
});
