"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
test("provider live workflow is secret-safe and conditional", () => { const text = fs.readFileSync(path.join(__dirname, "..", ".github", "workflows", "cli-gui-matrix.yml"), "utf8"); assert.match(text, /GOOGLE_API_KEY/); assert.match(text, /MINITOK_LIVE_OAUTH/); assert.match(text, /provider-live-result/); assert.match(text, /skipped/i); assert.match(text, /refresh_token|client_secret/); });
