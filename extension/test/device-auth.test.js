"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const root = path.join(__dirname, "..");
const sidebar = fs.readFileSync(path.join(root, "src", "sidebar.ts"), "utf8");
const html = fs.readFileSync(path.join(root, "src", "sidebar.html"), "utf8");
const auth = fs.readFileSync(path.join(root, "src", "device-auth.ts"), "utf8");

test("browser device auth contract", () => {
  assert.match(html, /Sign in with browser/);
  assert.match(html, /Sign out \/ switch account/);
  assert.match(sidebar, /device-login/);
  assert.match(sidebar, /device-logout/);
  assert.match(auth, /context\.secrets\.store/);
  assert.match(auth, /normalizeCustomerSession/);
  assert.match(auth, /token_type: string/);
  assert.match(auth, /openExternal/);
  assert.doesNotMatch(auth, /MINITOK_CUSTOMER_PASSWORD/);
  assert.doesNotMatch(auth, /console\.log\(.*access_token/);
});

test("auth failure categories are explicit", () => {
  assert.match(auth, /Network error/);
  assert.match(sidebar, /Entitlement error/);
  assert.match(auth, /Login failed/);
});
