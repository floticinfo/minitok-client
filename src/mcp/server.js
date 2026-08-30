"use strict";

const { RuntimeStdio } = require("../runtime/stdio");

class McpServer {
  constructor(options = {}) {
    this._stdio = new RuntimeStdio(options);
  }

  start() {
    this._stdio.start();
  }
}

module.exports = { McpServer };
