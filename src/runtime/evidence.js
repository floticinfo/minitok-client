"use strict";

const { collectEvidence } = require("../evidence/collector");

class EvidenceService {
  collect(repoRoot, options = {}) {
    return collectEvidence(repoRoot, options);
  }
}

module.exports = { EvidenceService };
