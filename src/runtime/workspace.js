"use strict";

const { WorkspaceManager } = require("../workspace/manager");

class WorkspaceService {
  constructor(minitokHome) {
    this._manager = new WorkspaceManager(minitokHome);
  }

  list() {
    return this._manager.listAll();
  }

  current() {
    return this._manager.currentWorkspace();
  }

  get(name) {
    return this._manager.get(name);
  }
}

module.exports = { WorkspaceService };
