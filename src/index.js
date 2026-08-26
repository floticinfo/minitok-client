"use strict";

/**
 * minitok — pure Node.js implementation.
 * Repository-aware autonomous coding workflow driver.
 */

const { MINITOK_VERSION } = require("./core/version");
const { WorkspaceManager } = require("./workspace/manager");
const { loadConfig } = require("./config/loader");
const { createProvider, detectAvailableProviders } = require("./llm/provider");
const { runPipeline } = require("./pipeline/loop");
const git = require("./git/operations");

module.exports = {
  version: MINITOK_VERSION,
  WorkspaceManager,
  loadConfig,
  createProvider,
  detectAvailableProviders,
  runPipeline,
  git,
};
