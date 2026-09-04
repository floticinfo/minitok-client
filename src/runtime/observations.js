"use strict";

const fs = require("fs");
const path = require("path");
const os = require("os");

const VALID_EVENT_TYPES = [
  "file_modified", "file_created", "file_deleted",
  "test_result", "lint_result", "command_executed",
  "task_started", "task_completed", "task_failed",
  "session_start", "session_end",
];
const EVENT_KEYS = new Set(["type", "path", "action", "command", "passed", "status", "summary", "duration_ms", "count"]);
const SECRET_KEY = /(token|secret|password|credential|authorization|api[_-]?key|private[_-]?key|prompt)/i;
const MAX_EVENTS = 100;
const MAX_STRING = 1000;
const MAX_FILE_BYTES = 1024 * 1024;

class ObservationService {
  constructor(options = {}) {
    this._storageDir = options.storageDir || path.join(os.homedir(), ".minitok", "observations");
  }

  ingest(options = {}) {
    const { project, events } = options;
    if (!Array.isArray(events)) return { accepted: 0, errors: ["events must be an array"] };
    if (events.length > MAX_EVENTS) return { accepted: 0, errors: [`events must contain at most ${MAX_EVENTS} items`] };

    const valid = [];
    const errors = [];
    for (const event of events) {
      if (!event || !event.type || !VALID_EVENT_TYPES.includes(event.type)) {
        errors.push(`Invalid event type: ${event?.type || "missing"}`);
        continue;
      }
      const safe = {};
      for (const [key, value] of Object.entries(event)) {
        if (!EVENT_KEYS.has(key) || SECRET_KEY.test(key)) continue;
        if (typeof value === "string") {
          if (value.length > MAX_STRING) { errors.push(`Event field too long: ${key}`); continue; }
          safe[key] = value;
        } else if (typeof value === "boolean" || (Number.isFinite(value) && Number.isSafeInteger(value))) {
          safe[key] = value;
        }
      }
      safe.type = event.type;
      safe.ingested_at = new Date().toISOString();
      valid.push(safe);
    }

    if (valid.length > 0) {
      this._persistEvents(typeof project === "string" && project.length <= MAX_STRING ? project : "default", valid);
    }

    return { accepted: valid.length, errors };
  }

  query(project, options = {}) {
    const dir = this._storageDir;
    const projectDir = path.join(dir, this._hashProject(project || "default"));
    try {
      const files = fs.readdirSync(projectDir).filter(f => f.endsWith(".jsonl")).sort();
      const allEvents = [];
      for (const f of files) {
        const data = fs.readFileSync(path.join(projectDir, f), "utf-8");
        for (const line of data.trim().split("\n").filter(Boolean)) {
          try { allEvents.push(JSON.parse(line)); } catch {}
        }
      }
      const limit = options.limit || 100;
      return { events: allEvents.slice(-limit), total: allEvents.length };
    } catch {
      return { events: [], total: 0 };
    }
  }

  _persistEvents(project, events) {
    const projectDir = path.join(this._storageDir, this._hashProject(project));
    fs.mkdirSync(projectDir, { recursive: true });
    const date = new Date().toISOString().slice(0, 10);
    let file = path.join(projectDir, `${date}.jsonl`);
    if (fs.existsSync(file) && fs.statSync(file).size >= MAX_FILE_BYTES) {
      let index = 1;
      do { file = path.join(projectDir, `${date}-${index}.jsonl`); index++; } while (fs.existsSync(file) && fs.statSync(file).size >= MAX_FILE_BYTES);
    }
    const lines = events.map(e => JSON.stringify(e)).join("\n") + "\n";
    fs.appendFileSync(file, lines, "utf-8");
  }

  _hashProject(project) {
    const crypto = require("crypto");
    return crypto.createHash("sha256").update(project).digest("hex").slice(0, 12);
  }
}

module.exports = { ObservationService, VALID_EVENT_TYPES };
