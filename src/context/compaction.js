"use strict";

/**
 * Deterministic active context compaction — token savings without LLM calls.
 *
 * Mirrors Python version's middle-elision compaction:
 * keeps head (60%) + tail (40%) when text exceeds budget_chars,
 * replacing the middle with a compact marker.
 */

const DEFAULT_CONTEXT_BUDGET_CHARS = 40_000; // ~10k tokens

/**
 * Compact text to fit within budget_chars by eliding the middle.
 * @param {string|null} text
 * @param {object} opts
 * @param {number} opts.budget_chars
 * @param {number} [opts.min_head_ratio=0.6]
 * @returns {{ text: string, original_chars: number, final_chars: number, compacted: boolean }}
 */
function compactText(text, opts = /** @type {{ budget_chars: number, min_head_ratio?: number }} */ ({ budget_chars: DEFAULT_CONTEXT_BUDGET_CHARS })) {
  const budget = opts.budget_chars || DEFAULT_CONTEXT_BUDGET_CHARS;
  const minHeadRatio = opts.min_head_ratio || 0.6;

  const original = text || "";
  const originalLen = original.length;

  if (originalLen <= budget) {
    return { text: original, original_chars: originalLen, final_chars: originalLen, compacted: false };
  }

  const nDropped = originalLen - budget;
  const marker = `\n\n[... STRIPPED ${nDropped} chars via active compaction | kept head+tail ...]\n\n`;
  let bodyBudget = budget - marker.length;
  if (bodyBudget < 40) {
    // Budget too small for head+marker+tail; keep head only
    return {
      text: original.slice(0, budget),
      original_chars: originalLen,
      final_chars: budget,
      compacted: true,
    };
  }

  const headLen = Math.floor(bodyBudget * minHeadRatio);
  const tailLen = bodyBudget - headLen;

  const head = original.slice(0, headLen);
  const tail = original.slice(-tailLen);

  return {
    text: head + marker + tail,
    original_chars: originalLen,
    final_chars: headLen + marker.length + tailLen,
    compacted: true,
  };
}

/**
 * Compact an object of named sections, each within its own budget.
 * @param {Record<string, string>} sections
 * @param {number} budgetPerSection
 * @returns {{ sections: Record<string, string>, stats: Record<string, { original: number, final: number, compacted: boolean }> }}
 */
function compactSections(sections, budgetPerSection = DEFAULT_CONTEXT_BUDGET_CHARS) {
  const result = /** @type {Record<string, string>} */ ({});
  const stats = /** @type {Record<string, { original: number, final: number, compacted: boolean }>} */ ({});
  for (const [key, value] of Object.entries(sections)) {
    const c = compactText(value, { budget_chars: budgetPerSection });
    result[key] = c.text;
    stats[key] = { original: c.original_chars, final: c.final_chars, compacted: c.compacted };
  }
  return { sections: result, stats };
}

module.exports = { compactText, compactSections, DEFAULT_CONTEXT_BUDGET_CHARS };
