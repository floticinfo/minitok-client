"use strict";

const fs = require("fs");
const path = require("path");
const { collectEvidence } = require("../evidence/collector");

class EvidenceService {
  constructor(options = {}) {
    this._workspaceRoots = (options.workspaceRoots || []).map(root => this._canonical(root));
    this._evidenceDirectory = options.evidenceDirectory;
  }

  _canonical(value) {
    if (typeof value !== "string" || !value) throw new TypeError("workspace root is required");
    return fs.realpathSync.native(path.resolve(value));
  }

  collect(repoRoot, options = {}) {
    const canonical = this._canonical(repoRoot);
    const roots = this._workspaceRoots.length ? this._workspaceRoots : [canonical];
    if (!roots.some(root => canonical === root || canonical.startsWith(root + path.sep))) throw new Error("Evidence path is outside a registered workspace");
    return collectEvidence(canonical, { ...options, workspaceRoot: canonical, evidenceDirectory: options.evidenceDirectory || this._evidenceDirectory });
  }
}

module.exports = { EvidenceService };
