"use strict";
const { describe, it, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const os = require("os");
const { EvolutionOptIn } = require("./optin");

function tmpOptIn() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "evo-optin-"));
  return new EvolutionOptIn(path.join(dir, "optin.json"));
}

describe("EvolutionOptIn", () => {
  it("default is disabled", () => {
    const o = tmpOptIn();
    assert.equal(o.isEnabled(), false);
  });

  it("enable sets enabled=true", () => {
    const o = tmpOptIn();
    o.enable();
    assert.equal(o.isEnabled(), true);
  });

  it("disable sets enabled=false", () => {
    const o = tmpOptIn();
    o.enable();
    o.disable();
    assert.equal(o.isEnabled(), false);
  });

  it("enable persists and status returns enabled", () => {
    const o = tmpOptIn();
    o.enable();
    const s = o.status();
    assert.equal(s.enabled, true);
  });

  it("disable persists and status returns disabled", () => {
    const o = tmpOptIn();
    o.enable();
    o.disable();
    const s = o.status();
    assert.equal(s.enabled, false);
  });

  it("missing file → default disabled", () => {
    const o = new EvolutionOptIn("/nonexistent/path/optin.json");
    assert.equal(o.isEnabled(), false);
  });

  it("corrupt file → default disabled", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "evo-optin-"));
    const fp = path.join(dir, "optin.json");
    fs.writeFileSync(fp, "not json!!!", "utf-8");
    const o = new EvolutionOptIn(fp);
    assert.equal(o.isEnabled(), false);
  });

  it("enabled: false in file → disabled", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "evo-optin-"));
    const fp = path.join(dir, "optin.json");
    fs.writeFileSync(fp, JSON.stringify({ enabled: false }), "utf-8");
    const o = new EvolutionOptIn(fp);
    assert.equal(o.isEnabled(), false);
  });

  it("enabled: \"true\" (string) → disabled (strict boolean check)", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "evo-optin-"));
    const fp = path.join(dir, "optin.json");
    fs.writeFileSync(fp, JSON.stringify({ enabled: "true" }), "utf-8");
    const o = new EvolutionOptIn(fp);
    assert.equal(o.isEnabled(), false);
  });
});