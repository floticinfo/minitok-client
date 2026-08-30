"use strict";

const { minitok_VERSION: MINITOK_VERSION } = require("./core/version");
const { WorkspaceManager } = require("./workspace/manager");
const { loadConfig } = require("./config/loader");
const { createProvider, detectAvailableProviders } = require("./llm/provider");
const { runPipeline } = require("./pipeline/loop");
const git = require("./git/operations");

module.exports = { MINITOK_VERSION, version: MINITOK_VERSION, WorkspaceManager, loadConfig, createProvider, detectAvailableProviders, runPipeline, git };
