"use strict";

/**
 * Entitlement Store — persists signed entitlement to disk.
 * Storage: ~/.minitok/entitlement/entitlement.json
 * Follows the same atomic-write + permission pattern as token-store.js.
 */

const fs = require("fs");
const path = require("path");
const os = require("os");
const { setOwnerOnlyPermissions } = require("../utils/file-permissions");

const DEFAULT_ENTITLEMENT_DIR = path.join(os.homedir(), ".minitok", "entitlement");
const ENTITLEMENT_FILE = "entitlement.json";

class EntitlementStore {
  constructor(entitlementDir) {
    this._dir = entitlementDir || DEFAULT_ENTITLEMENT_DIR;
    this._filePath = path.join(this._dir, ENTITLEMENT_FILE);
  }

  _ensureDir() {
    fs.mkdirSync(this._dir, { recursive: true });
  }

  /**
   * Load the stored entitlement artifact.
   * @returns {object | null} The artifact { payload, signature, key_id } or null if not found/corrupt.
   */
  load() {
    try {
      const data = fs.readFileSync(this._filePath, "utf-8");
      const parsed = JSON.parse(data);
      // Basic structural check: must have payload, signature, key_id
      if (
        parsed === null ||
        typeof parsed !== "object" ||
        Array.isArray(parsed) ||
        !parsed.payload ||
        !parsed.signature ||
        !parsed.key_id
      ) {
        return null;
      }
      return parsed;
    } catch {
      return null;
    }
  }

  /**
   * Save an entitlement artifact to disk using atomic write.
   * @param {object} artifact - { payload, signature, key_id }
   */
  save(artifact) {
    this._ensureDir();
    const record = {
      ...artifact,
      saved_at: new Date().toISOString(),
    };
    const tmp = this._filePath + ".tmp";
    fs.writeFileSync(tmp, JSON.stringify(record, null, 2), "utf-8", { mode: 0o600 });
    fs.renameSync(tmp, this._filePath);
    // P3-01: Set owner-only permissions (POSIX + Windows ACL)
    setOwnerOnlyPermissions(this._filePath);
  }

  /**
   * Delete the stored entitlement.
   */
  clear() {
    try {
      fs.unlinkSync(this._filePath);
    } catch {
      // Ignore if not found
    }
  }

  /**
   * Check if an entitlement file exists on disk.
   * @returns {boolean}
   */
  exists() {
    try {
      fs.accessSync(this._filePath, fs.constants.F_OK);
      return true;
    } catch {
      return false;
    }
  }
}

module.exports = { EntitlementStore, DEFAULT_ENTITLEMENT_DIR };
