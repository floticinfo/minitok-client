"use strict";

const { compactText, DEFAULT_CONTEXT_BUDGET_CHARS } = require("../context/compaction");

class CompactService {
  compact(text, options = {}) {
    return compactText(text, {
      budget_chars: options.budget_chars || DEFAULT_CONTEXT_BUDGET_CHARS,
      min_head_ratio: options.min_head_ratio,
    });
  }
}

module.exports = { CompactService };
