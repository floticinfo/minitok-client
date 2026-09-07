"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
test("live OS CI evidence contract", () => { const text = fs.readFileSync(path.join(__dirname, "..", ".github", "workflows", "cli-gui-matrix.yml"), "utf8"); for (const value of ["ubuntu-latest", "windows-latest", "macos-latest", "22.19.0", "24.x", "upload-artifact", "GITHUB_STEP_SUMMARY"]) assert.match(text, new RegExp(value.replace(/[.+]/g, "\\$&"))); });
