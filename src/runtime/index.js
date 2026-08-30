"use strict";

const { KnowledgeService } = require("./knowledge");
const { AnalysisService } = require("./analysis");
const { CompactService } = require("./compact");
const { EvidenceService } = require("./evidence");
const { WorkspaceService } = require("./workspace");
const { AuditService } = require("./audit");
const { EntitlementService } = require("./entitlement");
const { ObservationService } = require("./observations");

function createRuntimeServices(options = {}) {
  const knowledgePath = options.knowledgePath;
  const entitlementDir = options.entitlementDir;
  const auditPath = options.auditPath;

  return {
    knowledge: new KnowledgeService(knowledgePath),
    analysis: new AnalysisService(knowledgePath),
    compact: new CompactService(),
    evidence: new EvidenceService(),
    workspace: new WorkspaceService(),
    audit: new AuditService(auditPath),
    entitlement: new EntitlementService(entitlementDir),
    observation: new ObservationService(),
  };
}

module.exports = { createRuntimeServices };
