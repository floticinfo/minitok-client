"use strict";

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { shouldNotify, isNewerVersion, notifyIfOutdated, scheduleRefresh, writeCacheAtomic } = require("./update-check");

function tmpCachePath() {
  return path.join(fs.mkdtempSync(path.join(os.tmpdir(), "mt-upd-")), "update-check.json");
}

describe("isNewerVersion", () => {
  it("compares semver components", () => {
    assert.equal(isNewerVersion("1.3.2", "1.3.1"), true);
    assert.equal(isNewerVersion("1.4.0", "1.3.9"), true);
    assert.equal(isNewerVersion("2.0.0", "1.9.9"), true);
    assert.equal(isNewerVersion("1.3.1", "1.3.1"), false);
    assert.equal(isNewerVersion("1.3.0", "1.3.1"), false);
  });
});

describe("shouldNotify", () => {
  const now = Date.now();
  it("notifies once for a newer cached version", () => {
    const cache = { lastCheck: now, latest: "1.4.0" };
    assert.equal(shouldNotify(cache, "1.3.1", now).notify, true);
    const after = { ...cache, notifiedVersion: "1.4.0" };
    assert.equal(shouldNotify(after, "1.3.1", now).notify, false);
  });
  it("does not notify without cache or for same/older versions", () => {
    assert.equal(shouldNotify(null, "1.3.1", now).notify, false);
    assert.equal(shouldNotify({ lastCheck: now, latest: "1.3.1" }, "1.3.1", now).notify, false);
    assert.equal(shouldNotify({ lastCheck: now, latest: "1.2.0" }, "1.3.1", now).notify, false);
  });
});

describe("update cache writes", () => {
  it("keeps concurrent refreshes parseable", async () => {
    const cachePath = tmpCachePath();
    const fetchImpl = async () => ({ ok: true, json: async () => ({ version: "9.9.9" }) });
    scheduleRefresh({ cachePath, fetchImpl, now: Date.now() });
    scheduleRefresh({ cachePath, fetchImpl, now: Date.now() });
    await new Promise(resolve => setTimeout(resolve, 100));
    assert.equal(JSON.parse(fs.readFileSync(cachePath, "utf8")).latest, "9.9.9");
  });

  it("merges concurrent notification and refresh fields", () => {
    const cachePath = tmpCachePath();
    fs.writeFileSync(cachePath, JSON.stringify({ lastCheck: 1, latest: "9.9.9" }), "utf8");
    writeCacheAtomic(cachePath, { notifiedVersion: "9.9.9" });
    writeCacheAtomic(cachePath, { lastCheck: 2, latest: "10.0.0" });
    assert.deepEqual(JSON.parse(fs.readFileSync(cachePath, "utf8")), { lastCheck: 2, latest: "10.0.0", notifiedVersion: "9.9.9" });
  });
});

describe("notifyIfOutdated", () => {
  it("writes a notice to the stream and marks the version notified", () => {
    const cachePath = tmpCachePath();
    fs.writeFileSync(cachePath, JSON.stringify({ lastCheck: Date.now(), latest: "9.9.9" }), "utf-8");
    const chunks = [];
    const stream = { write: (s) => chunks.push(s) };
    const d1 = notifyIfOutdated({ cachePath, stream, currentVersion: "1.3.1" });
    assert.equal(d1.notify, true);
    assert.ok(chunks[0].includes("9.9.9"));
    const d2 = notifyIfOutdated({ cachePath, stream, currentVersion: "1.3.1" });
    assert.equal(d2.notify, false, "second run must not repeat the notice");
  });
});
