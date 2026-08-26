"use strict";

/**
 * Google Cloud Service Account Credential Resolver.
 * Supports both "authorized_user" (refresh token) and "service_account" (JWT) flows.
 * Follows Application Default Credentials (ADC) resolution:
 *   1. Explicit key_file path in auth config
 *   2. GOOGLE_APPLICATION_CREDENTIALS env var
 *   3. ~/.config/gcloud/application_default_credentials.json
 */

const fs = require("fs");
const path = require("path");
const os = require("os");
const crypto = require("crypto");
const { AuthError } = require("../core/errors");

const GCP_TOKEN_URL = "https://oauth2.googleapis.com/token";

class ServiceAccountResolver {
  /**
   * Resolve Google Cloud credentials.
   * @param {object} authConfig - Auth config block from minitok.yml
   * @returns {Promise<{ headers: object, token: string }>}
   */
  async resolve(authConfig = {}) {
    const keyFile = this._resolveGoogle(authConfig);
    const token = await this._getAccessToken(keyFile);
    return {
      headers: { Authorization: "Bearer " + token },
      token,
    };
  }

  /**
   * Find the service account key file using ADC resolution order.
   * @param {object} authConfig
   * @returns {object} Parsed key file contents
   */
  _resolveGoogle(authConfig) {
    // 1. Explicit key_file in config
    if (authConfig.key_file) {
      return this._loadKeyFile(authConfig.key_file);
    }

    // 2. GOOGLE_APPLICATION_CREDENTIALS env var
    const envPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
    if (envPath && fs.existsSync(envPath)) {
      return this._loadKeyFile(envPath);
    }

    // 3. Well-known location
    const homeDir = os.homedir();
    const defaultPath = path.join(
      homeDir,
      ".config",
      "gcloud",
      "application_default_credentials.json"
    );
    if (fs.existsSync(defaultPath)) {
      return this._loadKeyFile(defaultPath);
    }

    throw new AuthError(
      "No Google Cloud credentials found. Set auth.key_file in minitok.yml, " +
        "set GOOGLE_APPLICATION_CREDENTIALS, or run `gcloud auth application-default login`."
    );
  }

  /**
   * Load and parse a JSON key file.
   * @param {string} filePath
   * @returns {object}
   */
  _loadKeyFile(filePath) {
    try {
      const raw = fs.readFileSync(filePath, "utf-8");
      const data = JSON.parse(raw);
      if (!data.type) {
        throw new AuthError("Invalid key file: missing 'type' field");
      }
      return data;
    } catch (e) {
      if (e instanceof AuthError) throw e;
      throw new AuthError("Failed to read key file " + filePath + ": " + e.message);
    }
  }

  /**
   * Get an access token from the key file data.
   * @param {object} keyData - Parsed key file
   * @returns {Promise<string>} Access token
   */
  async _getAccessToken(keyData) {
    if (keyData.type === "authorized_user") {
      return this._refreshAuthorizedUser(keyData);
    }
    if (keyData.type === "service_account") {
      return this._signServiceAccount(keyData);
    }
    throw new AuthError("Unsupported key file type: " + keyData.type);
  }

  /**
   * Exchange a refresh token for an access token (authorized_user).
   * @param {object} keyData
   * @returns {Promise<string>}
   */
  async _refreshAuthorizedUser(keyData) {
    const params = new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: keyData.refresh_token,
      client_id: keyData.client_id,
      client_secret: keyData.client_secret,
    });

    const res = await fetch(GCP_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
    });

    if (!res.ok) {
      const body = await res.text();
      throw new AuthError("GCP token refresh failed (" + res.status + "): " + body);
    }

    const data = await res.json();
    return data.access_token;
  }

  /**
   * Create a JWT and sign it with the service account private key (RS256).
   * @param {object} keyData
   * @returns {Promise<string>}
   */
  async _signServiceAccount(keyData) {
    const now = Math.floor(Date.now() / 1000);
    const expiry = now + 3600;

    const header = { alg: "RS256", typ: "JWT" };
    const claimSet = {
      iss: keyData.client_email,
      scope: "https://www.googleapis.com/auth/cloud-platform",
      aud: GCP_TOKEN_URL,
      iat: now,
      exp: expiry,
    };

    const encodedHeader = Buffer.from(JSON.stringify(header))
      .toString("base64url");
    const encodedClaim = Buffer.from(JSON.stringify(claimSet))
      .toString("base64url");
    const signatureInput = encodedHeader + "." + encodedClaim;

    const sign = crypto.createSign("RSA-SHA256");
    sign.update(signatureInput);
    const signature = sign.sign(keyData.private_key, "base64url");

    const jwt = signatureInput + "." + signature;

    const params = new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    });

    const res = await fetch(GCP_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
    });

    if (!res.ok) {
      const body = await res.text();
      throw new AuthError("GCP JWT exchange failed (" + res.status + "): " + body);
    }

    const data = await res.json();
    return data.access_token;
  }
}

module.exports = { ServiceAccountResolver };
