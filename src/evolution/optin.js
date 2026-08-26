"use strict";

/**
 * Evolution Opt-In Store — manages user's explicit consent for evolution upload.
 *
 * Storage: ~/.minitok/evolution/optin.json
 * Default: OFF (fail-closed).
 *
 * Upload requires: entitlement + feature + opt-in. All three must be true.
 */

const fs = require("fs");
const path = require("path");
const os = require("os");
const { setOwnerOnlyPermissions } = require("../utils/file-permissions");

const DEFAULT_OPTIN_PATH = path.join(os.homedir(), ".minitok", "evolution", "optin.json");

class EvolutionOptIn {
  constructor(filePath) {
    this._file = filePath || DEFAULT_OPTIN_PATH;
  }

  _load() {
    try {
      const data = fs.readFileSync(this._file, "utf-8");
      const parsed = JSON.parse(data);
      return { enabled: parsed.enabled === true };
    } catch {
      return { enabled: false };
    }
  }

  _save(state) {
    const dir = path.dirname(this._file);
    fs.mkdirSync(dir, { recursive: true });
    const tmp = this._file + ".tmp";
    fs.writeFileSync(tmp, JSON.stringify(state, null, 2), "utf-8");
    fs.renameSync(tmp, this._file);
    // P3-03: Set owner-only permissions on opt-in file
    setOwnerOnlyPermissions(this._file);
  }

  /** Check if evolution upload is enabled. */
  isEnabled() {
    return this._load().enabled === true;
  }

  /** Enable evolution upload (explicit opt-in). */
  enable() {
    this._save({ enabled: true, enabled_at: new Date().toISOString() });
  }

  /** Disable evolution upload. */
  disable() {
    this._save({ enabled: false, disabled_at: new Date().toISOString() });
  }

  /** Get current status. */
  status() {
    return this._load();
  }
}

module.exports = { EvolutionOptIn, DEFAULT_OPTIN_PATH };