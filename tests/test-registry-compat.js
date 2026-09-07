"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const registryModule = import("../scripts/registry-compat.mjs");
const expected = { name: "@flotic/minitok", version: "1.3.3" };
const dist = { tarball: "https://registry.npmjs.org/@flotic/minitok/-/minitok-1.3.3.tgz", integrity: "sha512-test" };
const metadata = (version = "1.3.3", overrides = {}) => ({ name: expected.name, "dist-tags": { latest: version }, versions: { [version]: { version, dist } }, ...overrides });

test("published npm metadata resolves latest dist-tag and integrity", async () => {
  const { publishedMetadata, validateRegistryMetadata } = await registryModule;
  assert.deepEqual(publishedMetadata(metadata()), { ...metadata(), version: "1.3.3", dist });
  assert.deepEqual(validateRegistryMetadata(publishedMetadata(metadata()), expected), []);
});

test("registry metadata reports version mismatch and missing dist integrity", async () => {
  const { validateRegistryMetadata } = await registryModule;
  const errors = validateRegistryMetadata({ name: expected.name, version: "1.3.2", dist: { tarball: dist.tarball } }, expected);
  assert.match(errors.join("\n"), /does not match 1\.3\.3/);
  assert.match(errors.join("\n"), /tarball\/integrity/);
});

test("registry metadata rejects malformed response", async () => {
  const { validateRegistryMetadata } = await registryModule;
  assert.deepEqual(validateRegistryMetadata(null, expected), ["registry metadata is not an object"]);
});

test("registry fetch parses mocked current metadata shape", async () => {
  const { fetchRegistryMetadata } = await registryModule;
  const originalFetch = global.fetch;
  global.fetch = async () => new Response(JSON.stringify(metadata()), { status: 200, headers: { "content-length": "180" } });
  try { assert.deepEqual(await fetchRegistryMetadata("https://registry.npmjs.org/@flotic%2Fminitok"), metadata()); }
  finally { global.fetch = originalFetch; }
});

test("registry fetch rejects malformed JSON", async () => {
  const { fetchRegistryMetadata } = await registryModule;
  const originalFetch = global.fetch;
  global.fetch = async () => new Response("{bad", { status: 200 });
  try { await assert.rejects(fetchRegistryMetadata("https://registry.test"), /invalid JSON/); }
  finally { global.fetch = originalFetch; }
});

test("registry fetch aborts on timeout", async () => {
  const { fetchRegistryMetadata } = await registryModule;
  const originalFetch = global.fetch;
  global.fetch = (_url, { signal }) => new Promise((resolve, reject) => {
    signal.addEventListener("abort", () => { const error = new Error("aborted"); error.name = "AbortError"; reject(error); }, { once: true });
  });
  try { await assert.rejects(fetchRegistryMetadata("https://registry.test", { timeoutMs: 10 }), /timed out/); }
  finally { global.fetch = originalFetch; }
});
