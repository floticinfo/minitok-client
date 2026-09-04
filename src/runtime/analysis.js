"use strict";

const { analyzeFailurePatterns } = require("../evolution/analyzer");
const { recommendPolicy } = require("../evolution/policy");
const { KnowledgeService } = require("./knowledge");

class AnalysisService {
  constructor(knowledgePath) {
    this._knowledge = new KnowledgeService(knowledgePath);
  }

  analyze(project) {
    const outcomes = this._knowledge.query({ project }).outcomes;
    const analysis = analyzeFailurePatterns(outcomes);
    return analysis;
  }

  recommend(project, currentPolicy = {}) {
    const outcomes = this._knowledge.query({ project }).outcomes;
    const analysis = analyzeFailurePatterns(outcomes);
    return recommendPolicy(analysis.patterns, currentPolicy);
  }
}

module.exports = { AnalysisService };
