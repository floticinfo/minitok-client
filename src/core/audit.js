"use strict";

/**
 * Append-only audit log for file operations.
 * Records all file mutations for forensic analysis.
 */

const fs = require("fs");
const path = require("path");
const os = require("os");

const DEFAULT_AUDIT_PATH = path.join(os.homedir(), ".minitok", "audit.jsonl");

/**
 * Record an audit event.
 * @param {object} entry
 * @param {string} auditPath
 */
function auditLog(entry, auditPath) {
  const fp = auditPath || DEFAULT_AUDIT_PATH;
  const record = {
    timestamp: new Date().toISOString(),
    pid: process.pid,
    ...entry,
  };
  try {
    const dir = path.dirname(fp);
    fs.mkdirSync(dir, { recursive: true });
    fs.appendFileSync(fp, JSON.stringify(record) + "\n", "utf-8");
  } catch (error) {
    const warning = { persisted: false, record, warning: `Audit persistence failed: ${error.message}` };
    process.emitWarning(warning.warning, { code: "MINITOK_AUDIT_PERSISTENCE" });
    return warning;
  }
  return { persisted: true, record };
}

/**
 * Read audit log entries.
 * @param {string} auditPath
 * @param {number} limit
 * @returns {Array}
 */
function auditRead(auditPath, limit = 100) {
  const fp = auditPath || DEFAULT_AUDIT_PATH;
  try {
    const data = fs.readFileSync(fp, "utf-8");
    const lines = data.trim().split("\n").filter(Boolean);
    const entries = lines.map(l => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
    return entries.slice(-limit);
  } catch {
    return [];
  }
}

module.exports = { auditLog, auditRead, DEFAULT_AUDIT_PATH };
