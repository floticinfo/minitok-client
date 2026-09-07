"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");
const path = require("node:path");
const bin = path.resolve(__dirname, "../bin/minitok.js");
const loginScreen = require("../src/cli/login-screen.js");

test("gui exposes explicit non-TTY output and acceptance options", () => {
  const result = spawnSync(process.execPath, [bin, "gui", "--help"], { encoding: "utf8" });
  assert.equal(result.status, 0);
  assert.match(result.stdout, /--auto-accept/);
  assert.match(result.stdout, /--json/);
});

test("gui non-TTY without a task fails clearly", () => {
  const result = spawnSync(process.execPath, [bin, "gui"], { env: { ...process.env, MINITOK_NO_COLOR: "1" }, encoding: "utf8" });
  assert.notEqual(result.status, 0);
  assert.match(`${result.stdout}${result.stderr}`, /Non-TTY usage requires --task or MINITOK_TASK/);
});

test("login screen honors plain output controls", () => {
  assert.equal(loginScreen.plainOutput({}, { NO_COLOR: "1" }), true);
  assert.equal(loginScreen.plainOutput({}, { MINITOK_NO_COLOR: "1" }), true);
  assert.equal(loginScreen.plainOutput({}, { MINITOK_ASCII: "1" }), true);
  assert.equal(loginScreen.plainOutput({}, { MINITOK_PLAIN: "1" }), true);
  assert.equal(loginScreen.plainOutput({ plain: true }, {}), true);
  assert.equal(loginScreen.plainOutput({}, {}), false);
});

test("login screen suppresses ANSI clearing in plain modes", () => {
  for (const env of [{ NO_COLOR: "1" }, { MINITOK_NO_COLOR: "1" }, { MINITOK_ASCII: "1" }, { MINITOK_PLAIN: "1" }]) {
    let output = "";
    loginScreen.clearLoginScreen({}, env, { isTTY: true, write: value => { output += value; } });
    assert.equal(output, "");
  }
  let output = "";
  loginScreen.clearLoginScreen({}, {}, { isTTY: true, write: value => { output += value; } });
  assert.equal(output, "\x1b[2J\x1b[H");
});

test("entitlement failure keeps safe actionable detail", () => {
  const message = loginScreen.entitlementFailureMessage({ message: "Server rejected token=sk_live_123; retry at https://user:secret@example.test/v1/validate?token=abc" });
  assert.match(message, /Server rejected/);
  assert.match(message, /minitok activate/);
  assert.doesNotMatch(message, /sk_live_123|secret|token=abc/);
});

test("gui non-TTY task forwards explicit auto-accept policy", () => {
  const source = require("node:fs").readFileSync(path.resolve(__dirname, "../src/cli/commands/gui.js"), "utf8");
  assert.match(source, /autoAccept: options\.autoAccept === true/);
});

test("gui validates missing non-TTY task before entitlement", () => {
  const source = require("node:fs").readFileSync(path.resolve(__dirname, "../src/cli/commands/gui.js"), "utf8");
  assert.ok(source.indexOf('if (nonTty && !options.task') < source.indexOf('await requireEntitlement'));
});

test("gui non-TTY JSON output has a stable result shape", () => {
  const source = require("node:fs").readFileSync(path.resolve(__dirname, "../src/cli/commands/gui.js"), "utf8");
  assert.match(source, /command: "gui"/);
  assert.match(source, /status: result\.success \? "completed" : "failed"/);
  assert.match(source, /success: result\.success === true/);
});
