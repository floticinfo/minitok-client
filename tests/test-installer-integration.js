"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
for (const name of ["install-verified.sh", "install-verified.cmd"]) test(`${name} has verified rollback contract`, () => { const text = fs.readFileSync(path.join(__dirname, "..", "scripts", name), "utf8"); assert.match(text, /previous-version/); assert.match(text, /rollback|previous/i); assert.match(text, /integrity|sha512/i); });
