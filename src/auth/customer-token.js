"use strict";

const fs = require("fs");
const path = require("path");
const os = require("os");

const CUSTOMER_TOKEN_FILE = path.join(os.homedir(), ".minitok", "entitlement", "customer-token.json");

function loadCustomerToken(filePath = CUSTOMER_TOKEN_FILE) {
  if (process.env.MINITOK_CUSTOMER_TOKEN) return process.env.MINITOK_CUSTOMER_TOKEN;
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
  fs.writeFileSync(filePath, JSON.stringify({ token, saved_at: new Date().toISOString() }, null, 2), { encoding: "utf-8", mode: 0o600 });
}

function removeCustomerToken(filePath = CUSTOMER_TOKEN_FILE) {
  try { fs.unlinkSync(filePath); } catch {}
}

module.exports = { CUSTOMER_TOKEN_FILE, loadCustomerToken, saveCustomerToken, removeCustomerToken };
