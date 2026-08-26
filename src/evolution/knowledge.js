"use strict";

/**
 * KnowledgeStore — append-only evolution outcome storage.
 *
 * Mirrors Python version's knowledge/store.py:
 * stores EvolutionOutcome records in ~/.minitok/evolution/outcomes.json
 * with a bounded rolling window.
 */

const fs = require("fs");
const path = require("path");
const os = require("os");

const MAX_OUTCOMES = 100; // rolling window
const DEFAULT_PATH = path.join(os.homedir(), ".minitok", "evolution", "outcomes.json");

class KnowledgeStore {
  constructor(filePath) {
    this._file = filePath || DEFAULT_PATH;
    this._outcomes = this._load();
  }

  _load() {
    try {
      const data = fs.readFileSync(this._file, "utf-8");
      const parsed = JSON.parse(data);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  _save() {
    const dir = path.dirname(this._file);
    fs.mkdirSync(dir, { recursive: true });
    // Rolling window
    if (this._outcomes.length > MAX_OUTCOMES) {
      this._outcomes = this._outcomes.slice(-MAX_OUTCOMES);
    }
    const tmp = this._file + ".tmp." + process.pid + "." + Date.now();
    try {
      fs.writeFileSync(tmp, JSON.stringify(this._outcomes, null, 2), "utf-8");
      // Atomic rename — on Windows this overwrites the target
      fs.renameSync(tmp, this._file);
    } catch (e) {
      // Clean up temp file on failure
      try { fs.unlinkSync(tmp); } catch {}
      throw e;
    }
  }

  /**
   * Record an evolution outcome.
   * @param {object} outcome
   * @param {string} outcome.goal - original task goal
   * @param {string} outcome.status - success|failure|partial
   * @param {number} outcome.cycles - number of cycles taken
   * @param {number} outcome.total_cost - total LLM cost
   * @param {number} outcome.duration_ms - wall clock time
   * @param {number} outcome.files_changed - files modified
   * @param {string} [outcome.failure_category] - lint|test|validation|timeout|api_error
   * @param {string} [outcome.summary] - human-readable summary
   * @param {object} [outcome.policy_snapshot] - execution policy at time of run
   */
  record(outcome) {
    const record = {
      timestamp: new Date().toISOString(),
      ...outcome,
    };
    // Re-read from disk before save to preserve concurrent writes
    this._outcomes = this._load();
    this._outcomes.push(record);
    this._save();
    return record;
  }

  /** Get all recorded outcomes. */
  getAll() { return [...this._outcomes]; }

  /** Get the last N outcomes. */
  recent(n = 10) { return this._outcomes.slice(-n); }

  /** Count outcomes with a given status. */
  countByStatus(status) { return this._outcomes.filter(o => o.status === status).length; }

  /** Total number of outcomes. */
  get size() { return this._outcomes.length; }

  /** Compute aggregate stats. */
  stats() {
    const total = this._outcomes.length;
    if (total === 0) return { total: 0, success_rate: 0, avg_cycles: 0, avg_cost: 0 };

    const successes = this._outcomes.filter(o => o.status === "success").length;
    const avgCycles = this._outcomes.reduce((s, o) => s + (o.cycles || 0), 0) / total;
    const avgCost = this._outcomes.reduce((s, o) => s + (o.total_cost || 0), 0) / total;

    return {
      total,
      success_rate: successes / total,
      avg_cycles: Math.round(avgCycles * 100) / 100,
      avg_cost: Math.round(avgCost * 10000) / 10000,
    };
  }
}

module.exports = { KnowledgeStore, MAX_OUTCOMES, DEFAULT_PATH };
