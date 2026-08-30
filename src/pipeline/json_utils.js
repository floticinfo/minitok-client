"use strict";

/**
 * Safely extract the first valid JSON object from LLM response text.
 *
 * Unlike a greedy /\{[\s\S]*\}/ match, this finds the FIRST complete
 * JSON object by tracking brace depth, preventing pollution from
 * multiple JSON blocks or trailing text.
 *
 * @param {string} text - raw LLM response
 * @param {object} fallback - value to return if no JSON found
 * @returns {{ parsed: object, raw: string, valid: boolean }}
 */
function parseResponseJSON(text, fallback = {}) {
  if (!text || typeof text !== "string") {
    return { parsed: fallback, raw: text || "", valid: false };
  }

  // Find the first opening brace
  const start = text.indexOf("{");
  if (start === -1) {
    return { parsed: fallback, raw: text, valid: false };
  }

  // Track brace depth to find the matching closing brace
  let depth = 0;
  let inString = false;
  let escape = false;
  let end = -1;

  for (let i = start; i < text.length; i++) {
    const ch = text[i];

    if (escape) {
      escape = false;
      continue;
    }

    if (ch === "\\") {
      escape = true;
      continue;
    }

    if (ch === '"') {
      inString = !inString;
      continue;
    }

    if (inString) continue;

    if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) {
        end = i;
        break;
      }
    }
  }

  if (end === -1) {
    // No complete JSON object found
    return { parsed: fallback, raw: text, valid: false };
  }

  const candidate = text.substring(start, end + 1);
  try {
    const parsed = JSON.parse(candidate);
    return { parsed, raw: candidate, valid: true };
  } catch {
    return { parsed: fallback, raw: candidate, valid: false };
  }
}

module.exports = { parseResponseJSON };
