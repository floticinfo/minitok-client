"use strict";

const fs = require("fs");
const path = require("path");
const os = require("os");
const { setOwnerOnlyPermissions } = require("../utils/file-permissions");
const { readEnv } = require("../core/env");

const CUSTOMER_TOKEN_FILE = path.join(os.homedir(), ".minitok", "entitlement", "customer-token.json");

function loadCustomerToken(filePath = CUSTOMER_TOKEN_FILE) {
  const customerToken = readEnv("minitok_customer_token");
  if (customerToken) return customerToken;
  try {
    const record = JSON.parse(fs.readFileSync(filePath, "utf-8"));
    return typeof record.token === "string" && record.token ? record.token : null;
  } catch {
    return null;
  }
}

function saveCustomerToken(token, filePath = CUSTOMER_TOKEN_FILE) {
  if (typeof token !== "string" || !token) throw new TypeError("Customer token is required");
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const tempPath = `${filePath}.tmp.${process.pid}`;
  fs.writeFileSync(tempPath, JSON.stringify({ token, saved_at: new Date().toISOString() }, null, 2), { encoding: "utf-8", mode: 0o600 });
  setOwnerOnlyPermissions(tempPath);
  fs.renameSync(tempPath, filePath);
  // chmod/ACL must be applied after rename too: Windows inherits ACLs from
  // the destination directory and mode: 0o600 is not an ACL guarantee.
  setOwnerOnlyPermissions(filePath);
}

function removeCustomerToken(filePath = CUSTOMER_TOKEN_FILE) {
  try { fs.unlinkSync(filePath); } catch {}
}

module.exports = { CUSTOMER_TOKEN_FILE, loadCustomerToken, saveCustomerToken, removeCustomerToken };
