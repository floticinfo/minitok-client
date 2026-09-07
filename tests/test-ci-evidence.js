"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
test("CI matrix covers live OS and node evidence", () => { const file = path.join(__dirname, "..", ".github", "workflows", "cli-gui-matrix.yml"); const text = fs.readFileSync(file, "utf8"); for (const os of ["ubuntu-latest", "windows-latest", "macos-latest"]) assert.match(text, new RegExp(os)); for (const node of ["22.19.0", "24.x"]) assert.match(text, new RegExp(node.replace(".", "\\."))); assert.match(text, /upload-artifact/); assert.match(text, /GITHUB_STEP_SUMMARY/); });
