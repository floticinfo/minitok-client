"use strict";

/**
 * Failure pattern analyzer — deterministic failure categorization.
 *
 * Mirrors Python version's optimization/analyzer.py:
 * analyzes accumulated outcomes to detect patterns and suggest improvements.
 */

const _TIMEOUT_THRESHOLD = 3;
const _LOW_SUCCESS_RATE = 0.5;
const _CATEGORY_KEYWORDS = {
  lint: ["lint", "eslint", "style", "format"],
  test: ["test", "assertion", "expect", "assert"],
  validation: ["validation", "schema", "type", "typecheck"],
  syntax: ["syntax", "parse", "unexpected token"],
  import: ["import", "require", "module not found", "cannot find"],
  timeout: ["timeout", "timed out", "deadline exceeded"],
  api_error: ["api", "rate limit", "429", "500", "503"],
};

/**
 * Categorize a failure message into a category.
 * @param {string} message
 * @returns {string} category
 */
function categorizeFailure(message) {
  const lower = (message || "").toLowerCase();
  for (const [category, keywords] of Object.entries(_CATEGORY_KEYWORDS)) {
    if (keywords.some(kw => lower.includes(kw))) return category;
  }
  return "unknown";
}

/**
 * Analyze failure patterns from stored outcomes.
 * @param {Array} outcomes - array of EvolutionOutcome records
 * @returns {{ patterns: Array<{ category: string, count: number, last_occurrence: string }>, recommendations: string[] }}
 */
function analyzeFailurePatterns(outcomes) {
  const failures = outcomes.filter(o => o.status !== "success");
  if (failures.length === 0) {
    return { patterns: [], recommendations: [] };
  }

  // Count by category
  const categoryCounts = {};
  for (const f of failures) {
    const cat = f.failure_category || categorizeFailure(f.summary || "");
    if (!categoryCounts[cat]) categoryCounts[cat] = { count: 0, last_occurrence: f.timestamp };
    categoryCounts[cat].count++;
    if (f.timestamp > categoryCounts[cat].last_occurrence) {
      categoryCounts[cat].last_occurrence = f.timestamp;
    }
  }

  const patterns = Object.entries(categoryCounts)
    .map(([category, data]) => ({ category, ...data }))
    .sort((a, b) => b.count - a.count);

  // Generate recommendations
  const recommendations = [];
  const totalRuns = outcomes.length;
  const totalFailures = failures.length;
  const successRate = 1 - (totalFailures / totalRuns);

  if (successRate < _LOW_SUCCESS_RATE) {
    recommendations.push(`Low success rate (${(successRate * 100).toFixed(0)}%). Consider increasing max_cycles or retry_backoff_sec.`);
  }

  const timeoutFailures = categoryCounts.timeout?.count || 0;
  if (timeoutFailures >= _TIMEOUT_THRESHOLD) {
    recommendations.push(`${timeoutFailures} timeout failures detected. Consider increasing timeout_sec.`);
  }

  const apiErrors = categoryCounts.api_error?.count || 0;
  if (apiErrors >= 2) {
    recommendations.push(`${apiErrors} API errors detected. Consider adding provider fallback or reducing request frequency.`);
  }

  return { patterns, recommendations };
}

module.exports = { analyzeFailurePatterns, categorizeFailure, _CATEGORY_KEYWORDS };
