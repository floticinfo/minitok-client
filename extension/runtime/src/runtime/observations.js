"use strict";
const fs = require("fs");
const path = require("path");
const os = require("os");
const crypto = require("crypto");
const VALID_EVENT_TYPES = ["file_modified", "file_created", "file_deleted", "test_result", "lint_result", "command_executed", "task_started", "task_completed", "task_failed", "session_start", "session_end", "mcp_call", "auth_event", "cancelled", "error"];
const EVENT_KEYS = new Set(["type", "action", "passed", "status", "duration_ms", "count", "client", "client_name", "client_version", "tool", "category", "provider", "model"]);
const SECRET_KEY = /(token|secret|password|credential|authorization|api[_-]?key|private[_-]?key|prompt|task|path|repo|workspace|command)/i;
const MAX_EVENTS = 100;
const MAX_STRING = 256;
const MAX_FILE_BYTES = 1024 * 1024;
function redact(value) { if (typeof value !== "string") return value; return value.length > MAX_STRING ? value.slice(0, MAX_STRING) : value; }
class ObservationService {
  constructor(options = {}) { this._storageDir = options.storageDir || path.join(os.homedir(), ".minitok", "observations"); }
  ingest(options = {}) {
    const { project, events } = options;
    if (!Array.isArray(events)) return { accepted: 0, errors: ["events must be an array"] };
    if (events.length > MAX_EVENTS) return { accepted: 0, errors: [`events must contain at most ${MAX_EVENTS} items`] };
    const valid = []; const errors = [];
    for (const event of events) {
      if (!event || !event.type || !VALID_EVENT_TYPES.includes(event.type)) { errors.push(`Invalid event type: ${event?.type || "missing"}`); continue; }
      const safe = { type: event.type };
      for (const [key, value] of Object.entries(event)) {
        if (key === "type" || !EVENT_KEYS.has(key) || SECRET_KEY.test(key)) continue;
        if (typeof value === "string") safe[key] = redact(value);
        else if (typeof value === "boolean" || (Number.isFinite(value) && Number.isSafeInteger(value))) safe[key] = value;
      }
      safe.ingested_at = new Date().toISOString();
      valid.push(safe);
    }
    if (valid.length) this._persistEvents(typeof project === "string" && project.length <= MAX_STRING ? crypto.createHash("sha256").update(project).digest("hex").slice(0, 12) : "default", valid);
    return { accepted: valid.length, errors };
  }
  query(project, options = {}) { const dir = path.join(this._storageDir, this._hashProject(project || "default")); try { const events = fs.readdirSync(dir).filter(f => f.endsWith(".jsonl")).sort().flatMap(f => fs.readFileSync(path.join(dir, f), "utf8").trim().split("\n").filter(Boolean).map(line => { try { return JSON.parse(line); } catch { return null; } }).filter(Boolean)); const limit = options.limit || 100; return { events: events.slice(-limit), total: events.length }; } catch { return { events: [], total: 0 }; } }
  _persistEvents(project, events) { const dir = path.join(this._storageDir, project); fs.mkdirSync(dir, { recursive: true }); const date = new Date().toISOString().slice(0, 10); let file = path.join(dir, `${date}.jsonl`); if (fs.existsSync(file) && fs.statSync(file).size >= MAX_FILE_BYTES) { let index = 1; do { file = path.join(dir, `${date}-${index++}.jsonl`); } while (fs.existsSync(file) && fs.statSync(file).size >= MAX_FILE_BYTES); } fs.appendFileSync(file, `${events.map(JSON.stringify).join("\n")}\n`, "utf8"); }
  _hashProject(project) { return crypto.createHash("sha256").update(project).digest("hex").slice(0, 12); }
}
module.exports = { ObservationService, VALID_EVENT_TYPES };
