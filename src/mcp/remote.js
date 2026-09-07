"use strict";

const { fetchWithTimeout } = require("../core/http");
const { loadCustomerToken } = require("../auth/customer-token");

const MCP_PROTOCOL_VERSION = "2024-11-05";
const REMOTE_PATH = "/mcp";
const REMOTE_READ_ONLY_TOOLS = Object.freeze(new Set([
  "minitok_status",
  "minitok_compact",
]));
const LOCAL_ONLY_TOOLS = Object.freeze(new Set([
  "minitok_run",
  "minitok_run_cancel",
  "minitok_approve_run",
  "minitok_reject_run",
  "minitok_collect_evidence",
  "minitok_observe",
  "minitok_knowledge_record",
]));

function validateRemoteUrl(value) {
  let url;
  try { url = new URL(value); } catch { throw Object.assign(new Error("Remote MCP URL must be a valid HTTPS URL"), { code: "INVALID_REMOTE_URL" }); }
  if (url.protocol !== "https:") throw Object.assign(new Error("Remote MCP URL must use HTTPS"), { code: "INVALID_REMOTE_URL" });
  if (url.username || url.password) throw Object.assign(new Error("Remote MCP URL must not contain credentials"), { code: "INVALID_REMOTE_URL" });
  url.pathname = url.pathname.replace(/\/$/, "") || REMOTE_PATH;
  if (url.pathname !== REMOTE_PATH) throw Object.assign(new Error("Remote MCP URL must target /mcp"), { code: "INVALID_REMOTE_URL" });
  url.search = "";
  url.hash = "";
  return url.toString();
}

function classifyRemoteError(error) {
  if (error?.classification) return error.classification;
  if (error?.code === "INVALID_REMOTE_URL") return "configuration";
  if (error?.status >= 500) return "server";
  if (error?.status >= 400) return error.status === 401 || error.status === 403 ? "auth" : "protocol";
  return "network";
}

function remoteError(message, classification, details = {}) {
  return Object.assign(new Error(message), { code: "REMOTE_MCP_ERROR", classification, ...details });
}

class RemoteMcpClient {
  constructor(options = {}) {
    this.url = validateRemoteUrl(options.url);
    this.token = options.token || loadCustomerToken(options.tokenFile);
    if (!this.token) throw remoteError("Customer JWT is required for remote MCP", "auth", { code: "REMOTE_AUTH_REQUIRED" });
    this.timeoutMs = options.timeoutMs || 10000;
    this.sessionId = null;
    this.nextId = 1;
  }

  async request(method, params = {}) {
    const id = this.nextId++;
    const headers = { Accept: "application/json", ...(this.token ? { Authorization: `Bearer ${this.token}` } : {}) };
    if (this.sessionId) headers["Mcp-Session-Id"] = this.sessionId;
    let response;
    try {
      response = await fetchWithTimeout(this.url, { method: "POST", headers: { "Content-Type": "application/json", ...headers }, body: JSON.stringify({ jsonrpc: "2.0", id, method, params }) }, this.timeoutMs);
    } catch (error) {
      throw remoteError("Remote MCP network request failed", "network", { cause: error });
    }
    const session = response.headers.get("mcp-session-id");
    if (session) this.sessionId = session;
    let body;
    try { body = await response.json(); } catch { throw remoteError("Remote MCP returned invalid JSON", response.status >= 500 ? "server" : "protocol", { status: response.status }); }
    if (response.status >= 500) throw remoteError("Remote MCP server failure", "server", { status: response.status, body });
    if (response.status >= 400) throw remoteError(response.status === 401 || response.status === 403 ? "Remote MCP authentication or entitlement failed" : "Remote MCP HTTP protocol failure", response.status === 401 || response.status === 403 ? "auth" : "protocol", { status: response.status, body });
    const result = Array.isArray(body) ? body.find(item => item?.id === id) : body;
    if (result?.error) throw remoteError(result.error.message || "Remote MCP protocol error", result.error.data?.type === "ENTITLEMENT_REQUIRED" ? "auth" : "protocol", { status: response.status, rpcError: result.error });
    if (!result || result.id !== id) throw remoteError("Remote MCP response did not match request", "protocol", { status: response.status });
    return result.result;
  }

  async handshake() {
    const initialize = await this.request("initialize", { protocolVersion: MCP_PROTOCOL_VERSION, capabilities: {}, clientInfo: { name: "minitok-remote-client", version: "1" } });
    const listed = await this.request("tools/list");
    const tools = Array.isArray(listed?.tools) ? listed.tools : [];
    return { protocolVersion: initialize?.protocolVersion, sessionId: this.sessionId, tools: tools.filter(tool => REMOTE_READ_ONLY_TOOLS.has(tool.name)) };
  }

  async listTools() { return ((await this.request("tools/list"))?.tools || []).filter(tool => REMOTE_READ_ONLY_TOOLS.has(tool.name)); }

  async callTool(name, argumentsValue = {}) {
    if (LOCAL_ONLY_TOOLS.has(name) || !REMOTE_READ_ONLY_TOOLS.has(name)) throw remoteError(`Remote MCP tool is not supported: ${name}`, "configuration", { code: "REMOTE_TOOL_UNSUPPORTED" });
    return this.request("tools/call", { name, arguments: argumentsValue });
  }
}

async function remoteHealth(options) {
  const client = new RemoteMcpClient(options);
  return client.handshake();
}

function canFallbackToLocal(error) { return ["network", "server"].includes(classifyRemoteError(error)); }

module.exports = { RemoteMcpClient, remoteHealth, validateRemoteUrl, classifyRemoteError, canFallbackToLocal, REMOTE_READ_ONLY_TOOLS, LOCAL_ONLY_TOOLS, REMOTE_PATH };
