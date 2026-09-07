"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const bin = path.resolve(__dirname, "../bin/minitok.js");

test("bare non-TTY invocation exits with guidance and does not create state", () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), "minitok-cli-"));
  const result = spawnSync(process.execPath, [bin], { env: { ...process.env, HOME: home, USERPROFILE: home, MINITOK_UPDATE_CHECK: "0" }, encoding: "utf8" });
  assert.equal(result.status, 2);
  assert.match(`${result.stdout}${result.stderr}`, /minitok gui|--task/);
  assert.equal(fs.existsSync(path.join(home, ".minitok")), false);
});

test("ui is an explicit alias for gui", () => {
  const result = spawnSync(process.execPath, [bin, "ui", "--help"], { encoding: "utf8" });
  assert.equal(result.status, 0);
  assert.match(result.stdout, /Open the minitok terminal interface/);
});

test("help and version avoid update checks", () => {
  for (const args of [["--help"], ["--version"]]) {
    const result = spawnSync(process.execPath, [bin, ...args], { env: { ...process.env, MINITOK_UPDATE_CHECK: "1" }, encoding: "utf8" });
    assert.equal(result.status, 0);
  }
});
