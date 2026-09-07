"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");
const path = require("node:path");

const script = path.resolve(__dirname, "../scripts/stage2-parity.mjs");

test("Stage 2 parity is deterministic and does not contact production by default", () => {
  const result = spawnSync(process.execPath, [script], {
    cwd: path.resolve(__dirname, ".."),
    encoding: "utf8",
    env: { ...process.env, MINITOK_STAGE2_LIVE_SMOKE: "", MINITOK_STAGE2_LIVE_URL: "" },
  });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /production evidence: not contacted/);
  assert.match(result.stdout, /MCP HTTP localhost boundary/);
  assert.match(result.stdout, /trusted public-key fingerprint/);
});

test("Stage 2 live opt-in cannot silently target the production default", () => {
  const result = spawnSync(process.execPath, [script], {
    cwd: path.resolve(__dirname, ".."),
    encoding: "utf8",
    env: { ...process.env, MINITOK_STAGE2_LIVE_SMOKE: "1", MINITOK_STAGE2_LIVE_URL: "https://example.test" },
  });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /stage2 parity failed/);
});
