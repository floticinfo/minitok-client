"use strict";

/**
 * Token Store — persists OAuth/refresh tokens to disk.
 * Storage: ~/.minitok/tokens/<provider>.json
 */

const fs = require("fs");
const path = require("path");
const os = require("os");
const { AuthError } = require("../core/errors");
const { setOwnerOnlyPermissions } = require("../utils/file-permissions");

const TOKENS_DIR = path.join(os.homedir(), ".minitok", "tokens");

class TokenStore {
  constructor(tokensDir) {
    this._dir = tokensDir || TOKENS_DIR;
  }

  _ensureDir() {
    fs.mkdirSync(this._dir, { recursive: true });
  }

  _filePath(provider) {
    // Sanitize provider name for filename
    const safe = provider.replace(/[^a-zA-Z0-9_-]/g, "_");
    return path.join(this._dir, `${safe}.json`);
  }

  /**
   * Load stored token data for a provider.
   * @returns {{ access_token, refresh_token, expires_at, ... } | null}
   */
  load(provider) {
    const fp = this._filePath(provider);
    try {
      const data = fs.readFileSync(fp, "utf-8");
      return JSON.parse(data);
    } catch {
      return null;
    }
  }

  /**
   * Save token data for a provider.
   */
  save(provider, tokenData) {
    this._ensureDir();
    const fp = this._filePath(provider);
    const record = {
      provider,
      ...tokenData,
      saved_at: new Date().toISOString(),
    };
    const tmp = fp + ".tmp";
    fs.writeFileSync(tmp, JSON.stringify(record, null, 2), "utf-8", { mode: 0o600 });
    fs.renameSync(tmp, fp);
    // P3-01: Set owner-only permissions (POSIX + Windows ACL)
    setOwnerOnlyPermissions(fp);
  }

  /**
   * Delete stored token for a provider.
   */
  remove(provider) {
    const fp = this._filePath(provider);
    try {
      fs.unlinkSync(fp);
    } catch {
      // Ignore if not found
    }
  }

  /**
   * Check if a token exists and is not expired.
   * @returns {boolean}
   */
  isValid(provider) {
    const token = this.load(provider);
    if (!token || !token.access_token) return false;
    if (token.expires_at) {
      // Add 60-second buffer before expiry
      const expiry = new Date(token.expires_at).getTime() - 60000;
      if (Date.now() >= expiry) return false;
    }
    return true;
  }

  /**
   * List all stored providers.
   */
  list() {
    this._ensureDir();
    try {
      return fs.readdirSync(this._dir)
        .filter((f) => f.endsWith(".json"))
        .map((f) => {
          const data = JSON.parse(fs.readFileSync(path.join(this._dir, f), "utf-8"));
          return {
            provider: data.provider || f.replace(".json", ""),
            has_refresh: Boolean(data.refresh_token),
            expires_at: data.expires_at || null,
            valid: data.expires_at ? Date.now() < new Date(data.expires_at).getTime() - 60000 : true,
          };
        });
    } catch {
      return [];
    }
  }
}

module.exports = { TokenStore, TOKENS_DIR };
