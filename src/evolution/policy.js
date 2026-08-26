"use strict";

/**
 * Adaptive policy engine — recommends execution policy adjustments.
 *
 * Mirrors Python version's optimization/policy.py:
 * analyzes failure patterns and recommends timeout/retry/cycle adjustments.
 */

const _MAX_TIMEOUT = 900;
const _MAX_CYCLES = 5;
const _MIN_RETRIES = 0;
const _TIMEOUT_INCREASE_FACTOR = 1.3;

/**
 * Recommend policy adjustments based on failure patterns.
 * @param {Array} patterns - from analyzer.analyzeFailurePatterns
 * @param {object} currentPolicy - { timeout_sec, max_retries, max_cycles }
 * @returns {{ recommended: object, reasons: string[] }}
 */
function recommendPolicy(patterns, currentPolicy = {}) {
  const reasons = [];
  const recommended = {
    timeout_sec: currentPolicy.timeout_sec || 600,
    max_retries: currentPolicy.max_retries || 3,
    max_cycles: currentPolicy.max_cycles || 3,
  };

  for (const pattern of (patterns || [])) {
    if (pattern.category === "timeout" && pattern.count >= 3) {
      const newTimeout = Math.min(
        Math.round(recommended.timeout_sec * _TIMEOUT_INCREASE_FACTOR),
        _MAX_TIMEOUT
      );
      if (newTimeout > recommended.timeout_sec) {
        recommended.timeout_sec = newTimeout;
        reasons.push(`Timeout increased to ${newTimeout}s (${pattern.count} timeout failures)`);
      }
    }

    if (pattern.category === "api_error" && pattern.count >= 2) {
      recommended.max_retries = Math.min(recommended.max_retries + 1, 5);
      reasons.push(`Retries increased to ${recommended.max_retries} (${pattern.count} API errors)`);
    }

    if (pattern.category === "test" && pattern.count >= 3) {
      recommended.max_cycles = Math.min(recommended.max_cycles + 1, _MAX_CYCLES);
      reasons.push(`Max cycles increased to ${recommended.max_cycles} (${pattern.count} test failures need more iterations)`);
    }
  }

  // Decrease on sustained success — if most outcomes are successes, reduce cycles
  const successRate = patterns?.length
    ? (patterns.find(p => p.category === "_success")?.count || 0) /
      patterns.reduce((s, p) => s + p.count, 0)
    : 0;
  if (successRate >= 0.8 && patterns?.length) {
    const newCycles = Math.max(recommended.max_cycles - 1, 1);
    if (newCycles < recommended.max_cycles) {
      recommended.max_cycles = newCycles;
      reasons.push(`Max cycles decreased to ${newCycles} (${Math.round(successRate * 100)}% success rate)`);
    }
  }

  // Enforce minimums
  recommended.max_retries = Math.max(recommended.max_retries, _MIN_RETRIES);
  recommended.max_cycles = Math.max(recommended.max_cycles, 1);

  return { recommended, reasons };
}

module.exports = { recommendPolicy, _MAX_TIMEOUT, _MAX_CYCLES };
