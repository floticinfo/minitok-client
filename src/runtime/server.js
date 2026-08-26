"use strict";

const http = require("http");
const fs = require("fs");
const path = require("path");
const os = require("os");
const { createRuntimeServices } = require("./index");
const { createRoutes } = require("./routes");

const DEFAULT_PORT = 4578;
const IDLE_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
const PID_FILE = path.join(os.homedir(), ".minitok", "runtime.pid");
const HOST = "127.0.0.1";

class RuntimeServer {
  constructor(options = {}) {
    this._port = (options.port != null) ? options.port : DEFAULT_PORT;
    this._services = createRuntimeServices(options);
    this._server = null;
    this._idleTimer = null;
    this._activeRequests = 0;
    this._routes = createRoutes(this._services);
  }
  
  async start() {
    this._writePid();
    this._server = http.createServer((req, res) => this._handleRequest(req, res));
    
    return new Promise((resolve, reject) => {
      this._server.on("error", reject);
      this._server.listen(this._port, HOST, () => {
        this._port = this._server.address().port;
        resolve();
      });
    });
  }
  
  async stop() {
    if (this._idleTimer) clearTimeout(this._idleTimer);
    this._removePid();
    if (this._server) {
      return new Promise(resolve => this._server.close(resolve));
    }
  }
  
  async _handleRequest(req, res) {
    this._activeRequests++;
    this._resetIdleTimer();
    
    try {
      // Only allow localhost
      const remoteAddr = req.socket?.remoteAddress || "";
      if (!remoteAddr.includes("127.0.0.1") && !remoteAddr.includes("::1") && remoteAddr !== "") {
        this._sendJson(res, 403, { error: "Forbidden: localhost only" });
        return;
      }
      
      const url = new URL(req.url, `http://${HOST}:${this._port}`);
      const routeKey = `${req.method} ${url.pathname}`;
      
      // Parse body for POST
      let body = null;
      if (req.method === "POST") {
        body = await this._readBody(req);
      }
      
      const route = this._routes[routeKey];
      if (!route) {
        this._sendJson(res, 404, { error: "Not found" });
        return;
      }
      
      const params = {};
      url.searchParams.forEach((v, k) => { params[k] = v; });
      
      const result = await route({ body: body || {}, params });
      this._sendJson(res, result.status || 200, result.data || result);
    } catch (err) {
      this._sendJson(res, 500, { error: "Internal error" });
    } finally {
      this._activeRequests--;
      this._resetIdleTimer();
    }
  }
  
  _readBody(req) {
    return new Promise((resolve) => {
      const chunks = [];
      req.on("data", c => chunks.push(c));
      req.on("end", () => {
        try { resolve(JSON.parse(Buffer.concat(chunks).toString())); }
        catch { resolve(null); }
      });
      req.on("error", () => resolve(null));
    });
  }
  
  _sendJson(res, status, data) {
    res.writeHead(status, { "Content-Type": "application/json" });
    res.end(JSON.stringify(data));
  }
  
  _resetIdleTimer() {
    if (this._idleTimer) clearTimeout(this._idleTimer);
    if (this._activeRequests === 0) {
      this._idleTimer = setTimeout(() => {
        console.log("minitok runtime: idle timeout, shutting down");
        this.stop().catch(() => {});
        process.exit(0);
      }, IDLE_TIMEOUT_MS);
      if (this._idleTimer.unref) this._idleTimer.unref();
    }
  }
  
  _writePid() {
    try {
      fs.mkdirSync(path.dirname(PID_FILE), { recursive: true });
      fs.writeFileSync(PID_FILE, String(process.pid), "utf-8");
    } catch {}
  }
  
  _removePid() {
    try { fs.unlinkSync(PID_FILE); } catch {}
  }
  
  get port() { return this._port; }
  get services() { return this._services; }
}

module.exports = { RuntimeServer, DEFAULT_PORT, IDLE_TIMEOUT_MS, HOST };
