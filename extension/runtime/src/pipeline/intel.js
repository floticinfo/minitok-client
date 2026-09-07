"use strict";

const INTEL_SYSTEM_PROMPT = `You are a repository intelligence analyst. Inspect the repository context and task, then identify the relevant files, existing implementations, constraints, risks, and missing information needed before planning.

Output strict JSON:
{
  "summary": "one-line repository assessment",
  "relevant_files": ["path"],
  "existing_patterns": ["pattern"],
  "risks": ["risk"],
  "constraints": ["constraint"],
  "recommendations": ["recommendation"]
}`;

async function intel(provider, task, repoContext, options = {}) {
  const messages = [
    { role: "system", content: INTEL_SYSTEM_PROMPT },
    { role: "user", content: `## Task\n${task}\n\n## Repository Context\n${repoContext}\n\nIdentify facts the planner must use. Do not propose changes outside the task.` },
  ];
  const result = await provider.complete(messages, { ...options, max_tokens: 4096, temperature: 0.1 });
  const { parseResponseJSON } = require("./json_utils");
  const { parsed, valid } = parseResponseJSON(result.text, { error: "Invalid intelligence response", raw: result.text });
  return { intelligence: valid ? parsed : { error: parsed.error || "Invalid intelligence response", raw: parsed.raw || result.text }, tokens: result.tokens, model: result.model };
}

module.exports = { intel, INTEL_SYSTEM_PROMPT };
