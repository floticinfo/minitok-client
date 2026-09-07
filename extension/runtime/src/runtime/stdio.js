"use strict";

const { createRuntimeServices } = require("./index");
const { getToolDefinitions, getToolHandler, MCP_ERROR_CODES } = require("../mcp/tools");
const { version } = require("../../package.json");
const fs = require("fs");
const path = require("path");
const os = require("os");
const crypto = require("crypto");

const SUPPORTED_PROTOCOLS = ["2024-11-05"];

function loadAuthTokenFile(filePath, fileSystem = fs) {
  if (typeof filePath !== "string" || !filePath) return null;
  try {
    const value = fileSystem.readFileSync(filePath, "utf8").trim();
    if (!value) return null;
    try {
      const record = JSON.parse(value);
      return typeof record.token === "string" && record.token ? record.token : null;
    } catch {
      return value;
    }
  } catch {
    return null;
  }
}

function isValidJsonRpcRequest(msg) {
  const isObject = msg !== null && typeof msg === "object" && !Array.isArray(msg);
  const hasId = isObject && Object.prototype.hasOwnProperty.call(msg, "id");
  const validId = !hasId || msg.id === null || (typeof msg.id === "string" && msg.id.length > 0) || (typeof msg.id === "number" && Number.isFinite(msg.id));
  const validParams = !isObject || msg.params === undefined || (msg.params !== null && typeof msg.params === "object" && !Array.isArray(msg.params));
  return isObject && msg.jsonrpc === "2.0" && typeof msg.method === "string" && msg.method.length > 0 && validId && validParams;
}

class RuntimeStdio {
  constructor(options = {}) {
    this._services = options.services || createRuntimeServices(options);
    this._fs = options.fs || fs;
    this._workspaceRoot = options.workspaceRoot || process.cwd();
    this._permissions = new Set(String(options.permissions || process.env.MINITOK_MCP_PERMISSIONS || "read,write").split(",").map(value => value.trim()).filter(Boolean));
    this._authRequired = options.authRequired !== false;
    this._entitlementRequired = options.entitlementRequired !== false;
    this._authToken = options.authToken || process.env.MINITOK_MCP_AUTH_TOKEN || loadAuthTokenFile(options.authTokenFile || process.env.MINITOK_MCP_AUTH_TOKEN_FILE, this._fs);
    this._nextAuthToken = options.nextAuthToken || process.env.MINITOK_MCP_AUTH_TOKEN_NEXT || null;
    this._authExpiresAt = Number(options.authExpiresAt || process.env.MINITOK_MCP_AUTH_TOKEN_EXPIRES_AT || 0) || 0;
    this._nextAuthExpiresAt = Number(options.nextAuthExpiresAt || process.env.MINITOK_MCP_AUTH_TOKEN_NEXT_EXPIRES_AT || 0) || 0;
    this._authIssuedAt = Date.now();
    this._authTtlMs = Number(options.authTtlMs || process.env.MINITOK_MCP_AUTH_TOKEN_TTL_MS || 0) || 0;
    this._revokedTokens = new Set([...(options.revokedTokens || []), ...String(process.env.MINITOK_MCP_AUTH_TOKEN_REVOKED || "").split(",").map(value => value.trim()).filter(Boolean)]);
    this._runStatePath = options.runStatePath || path.join(os.homedir(), ".minitok", "mcp-runs.json");
    this._persistence = { persisted: true, error: null, operation: "load" };
    this._recoveredRuns = this._loadRunState();
    this._runs = new Map();
    this._requestToRun = new Map();
    this._maxConcurrentRuns = Math.max(1, Number(options.maxConcurrentRuns || process.env.MINITOK_MCP_MAX_CONCURRENT_RUNS || 1));
    this._clientInfo = null;
    this._sessionToken = null;
    this._initialized = false;
  }
  _loadRunState() {
    try {
      const value = JSON.parse(this._fs.readFileSync(this._runStatePath, "utf8"));
      if (!Array.isArray(value)) throw new Error("MCP run state must be an array");
      const records = value.filter(record => record && typeof record === "object" && typeof record.run_id === "string").map(record => record.state === "running" ? { ...record, state: "unknown", recovery: "interrupted" } : record);
      this._persistence = { persisted: true, error: null, operation: "load" };
      return records;
    } catch (error) {
      if (error.code === "ENOENT") {
        this._persistence = { persisted: true, error: null, operation: "load" };
      } else {
        this._persistence = { persisted: false, error: error.message, operation: "load" };
      }
      return [];
    }
  }
  _saveRunState() {
    const temp = `${this._runStatePath}.tmp.${process.pid}.${crypto.randomBytes(6).toString("hex")}`;
    try {
      this._fs.mkdirSync(path.dirname(this._runStatePath), { recursive: true, mode: 0o700 });
      const records = [...this._recoveredRuns.filter(record => !this._runs.has(record.run_id)), ...[...this._runs.values()].map(run => ({ run_id: run.runId, request_id: run.requestId, state: run.state, result: run.result || null }))].slice(-100);
      this._fs.writeFileSync(temp, JSON.stringify(records), { flag: "wx", mode: 0o600 });
      try {
        const fd = this._fs.openSync(temp, "r");
        try { this._fs.fsyncSync(fd); } finally { this._fs.closeSync(fd); }
      } catch (error) {
        if (!(process.platform === "win32" && ["EINVAL", "ENOTSUP", "EPERM", "EISDIR"].includes(error.code))) throw error;
      }
      this._fs.renameSync(temp, this._runStatePath);
      try {
        const dirFd = this._fs.openSync(path.dirname(this._runStatePath), "r");
        try { this._fs.fsyncSync(dirFd); } finally { this._fs.closeSync(dirFd); }
      } catch (error) {
        if (!(process.platform === "win32" && ["EINVAL", "ENOTSUP", "EPERM", "EISDIR"].includes(error.code))) throw error;
      }
      this._persistence = { persisted: true, error: null, operation: "save" };
      return this._persistence;
    } catch (error) {
      try { this._fs.rmSync(temp, { force: true }); } catch {}
      this._persistence = { persisted: false, error: error.message, operation: "save" };
      return this._persistence;
    }
  }
  rotateAuthToken(token, expiresAt = 0) {
    if (!token || typeof token !== "string") throw new TypeError("token is required");
    this._nextAuthToken = token;
    this._nextAuthExpiresAt = Number(expiresAt) || 0;
    return token;
  }
  revokeAuthToken(token) {
    if (token) this._revokedTokens.add(token);
  }
  _authValue(params) {
    const value = params.authToken || params.auth_token || params.authorization || params.headers?.Authorization || params.headers?.authorization;
    if (typeof value !== "string") return null;
    return value.replace(/^Bearer\s+/i, "").trim() || null;
  }
  _authValid(token) {
    if (!token || this._revokedTokens.has(token)) return false;
    const currentExpired = this._authExpiresAt > 0 ? Date.now() >= this._authExpiresAt : this._authTtlMs > 0 && Date.now() - this._authIssuedAt >= this._authTtlMs;
    const nextExpired = this._nextAuthExpiresAt > 0 && Date.now() >= this._nextAuthExpiresAt;
    return [this._authToken && !currentExpired, this._nextAuthToken && !nextExpired].some((valid, index) => {
      const expected = index === 0 ? this._authToken : this._nextAuthToken;
      if (!valid || typeof expected !== "string") return false;
      const supplied = Buffer.from(token); const target = Buffer.from(expected);
      return supplied.length === target.length && crypto.timingSafeEqual(supplied, target);
    });
  }
  start() { process.stdin.setEncoding("utf-8"); let buffer = ""; process.stdin.on("data", chunk => { buffer += chunk; const lines = buffer.split("\n"); buffer = lines.pop(); for (const line of lines) this._handleLine(line.trim()); }); process.stdin.on("end", () => { if (buffer.trim()) this._handleLine(buffer.trim()); }); }
  async _handleLine(line) {
    if (!line) return;
    let msg;
    try { msg = JSON.parse(line); } catch { this._respond({ jsonrpc: "2.0", id: null, error: { code: -32700, message: "Parse error", data: { type: "PARSE_ERROR" } } }); return; }
    if (Array.isArray(msg)) {
      if (msg.length === 0) return this._respond({ jsonrpc: "2.0", id: null, error: { code: -32600, message: "Invalid Request" } });
      const responses = [];
      const original = this._respond.bind(this);
      this._respond = value => responses.push(value);
      try { for (const item of msg) await this._handleMessage(item); } finally { this._respond = original; }
      for (const response of responses) this._respond(response);
      return;
    }
    await this._handleMessage(msg);
  }
  async _handleMessage(msg) {
    const isObject = msg !== null && typeof msg === "object" && !Array.isArray(msg);
    const hasId = isObject && Object.prototype.hasOwnProperty.call(msg, "id");
    if (!isValidJsonRpcRequest(msg)) return this._respond({ jsonrpc: "2.0", id: null, error: { code: -32600, message: "Invalid Request" } });
    const isNotification = !hasId;
    const respond = value => { if (!isNotification) this._respond(value); };
    const { id, method, params = {} } = msg;
    const correlationId = params.correlation_id || crypto.randomUUID();
    if (this._authRequired && !this._authToken && !this._nextAuthToken && method !== "initialize") return this._error(id, MCP_ERROR_CODES.AUTH_REQUIRED, "Authentication required", "AUTH_REQUIRED", correlationId, {}, respond);
    if (this._authRequired && method !== "initialize" && (!this._initialized || !this._authValid(this._authValue(params)) || this._authValue(params) !== this._sessionToken)) return this._error(id, MCP_ERROR_CODES.AUTH_REQUIRED, "Authentication required", "AUTH_REQUIRED", correlationId, {}, respond);
    if (method === "initialize") {
      const requested = Array.isArray(params.protocolVersions) ? params.protocolVersions : [params.protocolVersion];
      const protocolVersion = requested.find(version => SUPPORTED_PROTOCOLS.includes(version));
      if (!protocolVersion) return this._error(id, -32602, "Unsupported protocol version", "PROTOCOL_VERSION_UNSUPPORTED", correlationId, { supported: SUPPORTED_PROTOCOLS });
       this._clientInfo = params.clientInfo && typeof params.clientInfo === "object" ? { name: String(params.clientInfo.name || "unknown").slice(0, 128), version: String(params.clientInfo.version || "").slice(0, 64) } : null;
       this._sessionToken = this._authValue(params) || this._authToken || this._nextAuthToken;
        this._initialized = true;
         respond({ jsonrpc: "2.0", id, result: { protocolVersion, capabilities: { tools: { listChanged: false }, resources: { subscribe: false, listChanged: false }, prompts: { listChanged: false } }, serverInfo: { name: "minitok-runtime", version } } }); return;
    }
     if (method === "notifications/initialized") return;
      if (this._entitlementRequired && ["resources/list", "resources/read", "prompts/list", "prompts/get", "tools/list", "tools/call"].includes(method)) {
        const policy = await this._services.entitlement.status();
        if (!policy?.allowed) return this._error(id, MCP_ERROR_CODES.PERMISSION_DENIED, policy?.message || "Paid entitlement required", "ENTITLEMENT_REQUIRED", correlationId, { state: policy?.state }, respond);
      }
     if (method === "notifications/cancelled") { const runId = params.run_id || this._requestToRun.get(params.requestId); const run = this._runs.get(runId); if (run) { run.state = "cancelled"; run.controller.abort(); run.persistence = this._saveRunState(); } return; }
    if (method === "resources/list") return respond({ jsonrpc: "2.0", id, result: { resources: [{ uri: "minitok://status", name: "minitok status", mimeType: "application/json" }, { uri: "minitok://runs", name: "minitok runs", mimeType: "application/json" }] } });
    if (method === "resources/read") { if (!["minitok://status", "minitok://runs"].includes(params.uri)) return this._error(id, MCP_ERROR_CODES.NOT_FOUND, "Resource not found", "RESOURCE_NOT_FOUND", correlationId, {}, respond); const value = params.uri === "minitok://runs" ? [...this._runs.values(), ...this._recoveredRuns].map(run => ({ run_id: run.runId || run.run_id, state: run.state })) : await this._services.entitlement.status(); return respond({ jsonrpc: "2.0", id, result: { contents: [{ uri: params.uri, mimeType: "application/json", text: JSON.stringify(value) }] } }); }
    if (method === "prompts/list") return respond({ jsonrpc: "2.0", id, result: { prompts: [{ name: "minitok_task", description: "Start a verified autonomous minitok task", arguments: [{ name: "task", required: true }] }] } });
     if (method === "prompts/get") { if (params.name !== "minitok_task") return this._error(id, MCP_ERROR_CODES.NOT_FOUND, "Prompt not found", "PROMPT_NOT_FOUND", correlationId, {}, respond); return respond({ jsonrpc: "2.0", id, result: { description: "Verified minitok task", messages: [{ role: "user", content: { type: "text", text: String(params.arguments?.task || "") } }] } }); }
    if (method === "tools/list") return respond({ jsonrpc: "2.0", id, result: { tools: getToolDefinitions() } });
    if (method !== "tools/call") return this._error(id, -32601, `Method not found: ${method}`, "METHOD_NOT_FOUND", correlationId, {}, respond);
    const definition = getToolDefinitions().find(tool => tool.name === params.name);
    if (!definition) return this._error(id, MCP_ERROR_CODES.NOT_FOUND, "Tool not found", "TOOL_NOT_FOUND", correlationId, {}, respond);
    if (definition.annotations.destructiveHint && !this._permissions.has("write")) return this._error(id, MCP_ERROR_CODES.PERMISSION_DENIED, "Workspace write permission required", "PERMISSION_DENIED", correlationId, {}, respond);
    if (params.name === "minitok_run" && [...this._runs.values()].filter(run => run.state === "running").length >= this._maxConcurrentRuns) return this._error(id, MCP_ERROR_CODES.RUN_LIMIT_REACHED, "Concurrent run limit reached", "RUN_LIMIT_REACHED", correlationId, {}, respond);
    const runId = params.name === "minitok_run" ? crypto.randomUUID() : null;
    const controller = new AbortController();
     if (runId) {
       this._runs.set(runId, { runId, requestId: id, controller, state: "running", persistence: null });
       this._requestToRun.set(id, runId);
       const persistence = this._saveRunState();
       const run = this._runs.get(runId);
       if (run) run.persistence = persistence;
     }
     try {
      const result = await getToolHandler(params.name, { ...(params.arguments || {}), run_id: runId }, this._services, { safeResult: true, signal: controller.signal, runs: this._runs, recoveredRuns: this._recoveredRuns, persistence: this._persistence, workspaceRoot: this._workspaceRoot, permissions: this._permissions, writeApproval: (file, decision, binding) => { const stat = fs.lstatSync(file); if (!stat.isFile() || stat.isSymbolicLink() || fs.realpathSync.native(file) !== file) throw Object.assign(new Error("Approval request path is not a regular file"), { code: "APPROVAL_INVALID" }); let request; try { request = JSON.parse(fs.readFileSync(file, "utf8")); } catch { throw Object.assign(new Error("Approval request is malformed"), { code: "APPROVAL_INVALID" }); } if (request.type !== "approval_request" || (decision !== "approve" && decision !== "reject") || typeof request.nonce !== "string" || request.nonce !== binding.nonce || request.run_id !== binding.runId || !Number.isFinite(request.expires_at) || Date.now() >= request.expires_at) throw Object.assign(new Error("Approval request is stale or mismatched"), { code: "APPROVAL_INVALID" }); const target = `${file}.response`; try { const targetStat = fs.lstatSync(target); if (targetStat.isSymbolicLink() || !targetStat.isFile()) throw Object.assign(new Error("Approval response path is not a regular file"), { code: "APPROVAL_INVALID" }); } catch (error) { if (error.code !== "ENOENT") throw error; } const temp = `${target}.tmp.${process.pid}.${crypto.randomBytes(6).toString("hex")}`; const fd = fs.openSync(temp, "wx", 0o600); try { fs.writeFileSync(fd, `${JSON.stringify({ decision, nonce: binding.nonce, run_id: binding.runId })}\n`, { encoding: "utf8" }); fs.fsyncSync(fd); } finally { fs.closeSync(fd); } try { fs.renameSync(temp, target); } catch (error) { try { fs.rmSync(temp, { force: true }); } catch {} throw error; } }, onProgress: event => { if (runId && !isNotification) { const progress = Number.isFinite(event.progress) ? event.progress : ({ intel: 1, plan: 2, work: 3, verify: 4, review: 5 }[event.phase] || 0); this._respond({ jsonrpc: "2.0", method: "notifications/progress", params: { progressToken: params._meta?.progressToken ?? params.meta?.progressToken ?? null, progress, total: 5, message: JSON.stringify({ phase: event.phase, state: event.state, run_id: runId, correlation_id: correlationId }) } }); } } });
       if (runId) { const run = this._runs.get(runId); if (run && run.state !== "cancelled" && !controller.signal.aborted) run.state = "completed"; if (run) { run.result = result; run.persistence = this._saveRunState(); } }
       respond({ jsonrpc: "2.0", id, result: { ...result, run_id: runId, correlation_id: correlationId, structuredContent: result.structuredContent || null, persistence: runId ? this._runs.get(runId)?.persistence || this._persistence : undefined, isError: result.isError === true } });
     } catch (error) { if (runId) { const run = this._runs.get(runId); if (run) { run.state = controller.signal.aborted ? "cancelled" : "failed"; run.result = { error: error.message }; run.persistence = this._saveRunState(); } } this._error(id, this._errorCode(error.code), error.message, error.code || "MCP_TOOL_ERROR", correlationId, { run_id: runId, persistence: runId ? this._runs.get(runId)?.persistence || this._persistence : undefined }, respond); }
    finally { if (runId) { this._requestToRun.delete(id); } }
  }
  _error(id, code, message, type, correlationId, extra = {}, respond = this._respond.bind(this)) { respond({ jsonrpc: "2.0", id, error: { code, message, data: { type, correlation_id: correlationId, ...extra } } }); }
  _errorCode(code) { return code === "INVALID_PARAMS" || code === "INVALID_PATH" || code === "PATH_OUTSIDE_WORKSPACE" ? -32602 : code === "RUN_NOT_FOUND" || code === "TOOL_NOT_FOUND" ? MCP_ERROR_CODES.NOT_FOUND : MCP_ERROR_CODES.TOOL_ERROR; }
  _respond(msg) { process.stdout.write(`${JSON.stringify(msg)}\n`); }
}
module.exports = { RuntimeStdio, SUPPORTED_PROTOCOLS, isValidJsonRpcRequest, loadAuthTokenFile };
