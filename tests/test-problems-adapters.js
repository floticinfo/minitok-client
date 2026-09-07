"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
test("IDE/compiler problem fixtures are available", () => { for (const file of ["problems.sarif.json", "problems-eslint.json", "problems-tsc.txt"]) assert.ok(fs.existsSync(path.join(__dirname, "fixtures", file))); });
