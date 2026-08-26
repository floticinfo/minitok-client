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

class ObservationService {
  constructor(options = {}) {
    this._storageDir = options.storageDir || path.join(os.homedir(), ".minitok", "observations");
  }
  
  ingest(options = {}) {
    const { project, events } = options;
    if (!Array.isArray(events)) return { accepted: 0, errors: ["events must be an array"] };
    
    const valid = [];
    const errors = [];
    for (const event of events) {
      if (!event || !event.type || !VALID_EVENT_TYPES.includes(event.type)) {
        errors.push(`Invalid event type: ${event?.type || "missing"}`);
        continue;
      }
      valid.push({
        ...event,
        ingested_at: new Date().toISOString(),
      });
    }
    
    if (valid.length > 0) {
      this._persistEvents(project || "default", valid);
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
    const file = path.join(projectDir, `${date}.jsonl`);
    const lines = events.map(e => JSON.stringify(e)).join("\n") + "\n";
    fs.appendFileSync(file, lines, "utf-8");
  }
  
  _hashProject(project) {
    const crypto = require("crypto");
    return crypto.createHash("sha256").update(project).digest("hex").slice(0, 12);
  }
}

module.exports = { ObservationService, VALID_EVENT_TYPES };
