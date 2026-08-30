"use strict";

const { KnowledgeStore } = require("../evolution/knowledge");

class KnowledgeService {
  constructor(knowledgePath) {
    this._store = new KnowledgeStore(knowledgePath);
  }

  query(options = {}) {
    const { limit, filter } = options;
    let outcomes = this._store.getAll();
    if (filter) {
      if (filter.status) outcomes = outcomes.filter(o => o.status === filter.status);
    }
    if (limit) outcomes = outcomes.slice(-limit);
    return { outcomes, total: this._store.size };
  }

  record(outcome) {
    const recorded = this._store.record(outcome);
    return { recorded: true, total: this._store.size };
  }

  get size() { return this._store.size; }
  get store() { return this._store; }
}

module.exports = { KnowledgeService };
