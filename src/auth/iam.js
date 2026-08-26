"use strict";

/**
 * AWS IAM Credential Resolver.
 * Follows the standard AWS credential chain:
 *   1. Explicit config (auth block in minitok.yml)
 *   2. Environment variables
 *   3. ~/.aws/credentials
 *   4. ~/.aws/config (with [profile name] sections)
 */

const fs = require("fs");
const path = require("path");
const os = require("os");
const crypto = require("crypto");
const { AuthError } = require("../core/errors");

class IAMResolver {
  /**
   * Resolve AWS credentials from config or environment.
   * @param {object} authConfig - Auth config block from minitok.yml
   * @returns {Promise<{ headers: object, token: string|null }>}
   */
  async resolve(authConfig = {}) {
    const creds = this._resolveAWS(authConfig);
    const headers = this._signRequest(creds);
    return { headers, token: creds.session_token || creds.access_key_id };
  }

  /**
   * Walk the credential chain: config -> env -> files.
   * @param {object} authConfig
   * @returns {{ access_key_id: string, secret_access_key: string, session_token?: string, region?: string }}
   */
  _resolveAWS(authConfig) {
    // 1. Explicit config
    if (authConfig.access_key_id && authConfig.secret_access_key) {
      return {
        access_key_id: authConfig.access_key_id,
        secret_access_key: authConfig.secret_access_key,
        session_token: authConfig.session_token || undefined,
        region: authConfig.region || process.env.AWS_REGION || "us-east-1",
      };
    }

    // 2. Environment variables
    const envCreds = {
      access_key_id: process.env.AWS_ACCESS_KEY_ID || "",
      secret_access_key: process.env.AWS_SECRET_ACCESS_KEY || "",
      session_token: process.env.AWS_SESSION_TOKEN || undefined,
      region: process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || "us-east-1",
    };
    if (envCreds.access_key_id && envCreds.secret_access_key) {
      return envCreds;
    }

    // 3. ~/.aws/credentials
    const profile = authConfig.profile || process.env.AWS_PROFILE || "default";
    const homeDir = os.homedir();

    const credsFile = path.join(homeDir, ".aws", "credentials");
    if (fs.existsSync(credsFile)) {
      const parsed = this._parseIniFile(credsFile, profile);
      if (parsed && parsed.aws_access_key_id) {
        return {
          access_key_id: parsed.aws_access_key_id,
          secret_access_key: parsed.aws_secret_access_key || "",
          session_token: parsed.aws_session_token || undefined,
          region: parsed.region || envCreds.region,
        };
      }
    }

    // 4. ~/.aws/config
    const configFile = path.join(homeDir, ".aws", "config");
    if (fs.existsSync(configFile)) {
      const sectionName = profile === "default" ? "default" : "profile " + profile;
      const parsed = this._parseIniFile(configFile, sectionName);
      if (parsed && parsed.aws_access_key_id) {
        return {
          access_key_id: parsed.aws_access_key_id,
          secret_access_key: parsed.aws_secret_access_key || "",
          session_token: parsed.aws_session_token || undefined,
          region: parsed.region || envCreds.region,
        };
      }
    }

    throw new AuthError(
      "No AWS credentials found. Set AWS_ACCESS_KEY_ID/AWS_SECRET_ACCESS_KEY, " +
        "configure ~/.aws/credentials, or set auth.access_key_id in minitok.yml."
    );
  }

  /**
   * Parse a simple INI file, returning key-value pairs for the requested section.
   * @param {string} filePath
   * @param {string} section - Section name (e.g. "default" or "profile dev")
   * @returns {object|null}
   */
  _parseIniFile(filePath, section) {
    try {
      const content = fs.readFileSync(filePath, "utf-8");
      const lines = content.split(/\r?\n/);
      let currentSection = null;
      let inTarget = false;
      const result = {};

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#") || trimmed.startsWith(";")) continue;

        const sectionMatch = trimmed.match(/^\[([^\]]+)\]$/);
        if (sectionMatch) {
          if (inTarget) return Object.keys(result).length > 0 ? result : null;
          currentSection = sectionMatch[1].trim();
          inTarget = currentSection.toLowerCase() === section.toLowerCase();
          continue;
        }

        if (inTarget) {
          const eqIdx = trimmed.indexOf("=");
          if (eqIdx > 0) {
            const key = trimmed.slice(0, eqIdx).trim().toLowerCase();
            const value = trimmed.slice(eqIdx + 1).trim();
            result[key] = value;
          }
        }
      }

      return inTarget && Object.keys(result).length > 0 ? result : null;
    } catch {
      return null;
    }
  }

  /**
   * Generate AWS Signature V4-style headers for request authentication.
   * @param {object} creds
   * @returns {object} Headers to attach to the outgoing request
   */
  _signRequest(creds) {
    const now = new Date();
    const xAmzDate = now.toISOString().replace(/[:\-\.]/g, "").slice(0, 15) + "Z";

    const headers = {
      "x-amz-date": xAmzDate,
      Authorization: "AWS4-HMAC-SHA256 Credential=" + creds.access_key_id,
    };

    if (creds.session_token) {
      headers["x-amz-security-token"] = creds.session_token;
    }

    return headers;
  }
}

module.exports = { IAMResolver };
