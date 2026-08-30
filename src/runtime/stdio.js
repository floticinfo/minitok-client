"use strict";

const { createRuntimeServices } = require("./index");
const { createRoutes } = require("./routes");

class RuntimeStdio {
  constructor(options = {}) {
    this._services = createRuntimeServices(options);
    this._routes = createRoutes(this._services);
  }

  start() {
    process.stdin.setEncoding("utf-8");
    let buffer = "";

    process.stdin.on("data", (chunk) => {
      buffer += chunk;
      const lines = buffer.split("\n");
      buffer = lines.pop();
      for (const line of lines) {
        this._handleLine(line.trim());
      }
    });

    process.stdin.on("end", () => {
      if (buffer.trim()) this._handleLine(buffer.trim());
    });
  }

  async _handleLine(line) {
    if (!line) return;
    let msg;
    try { msg = JSON.parse(line); }
    catch { this._respond({ jsonrpc: "2.0", id: null, error: { code: -32700, message: "Parse error" } }); return; }

    const { id, method, params } = msg;
    if (method === "initialize") {
      this._respond({ jsonrpc: "2.0", id, result: { protocolVersion: "2024-11-05", capabilities: { tools: {} }, serverInfo: { name: "minitok-runtime", version: "1.0.0" } } });
      return;
    }
    if (method === "notifications/initialized") return;
    if (method === "tools/list") {
      const tools = require("../mcp/tools").getToolDefinitions();
      this._respond({ jsonrpc: "2.0", id, result: { tools } });
      return;
    }
    if (method === "tools/call") {
      const { getToolHandler } = require("../mcp/tools");
      try {
        const result = await getToolHandler(params.name, params.arguments || {}, this._services);
        this._respond({ jsonrpc: "2.0", id, result });
      } catch (err) {
        this._respond({ jsonrpc: "2.0", id, error: { code: -32000, message: err.message } });
      }
      return;
    }
    this._respond({ jsonrpc: "2.0", id, error: { code: -32601, message: `Method not found: ${method}` } });
  }

  _respond(msg) {
    process.stdout.write(JSON.stringify(msg) + "\n");
  }
}

module.exports = { RuntimeStdio };
