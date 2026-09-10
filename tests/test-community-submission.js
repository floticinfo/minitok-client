"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");

async function previewFor(platforms) {
  const { buildPreview } = await import("../scripts/community-submission.mjs");
  return buildPreview(platforms);
}

test("community preview is side-effect free and excludes credentials", async () => {
  const preview = await previewFor(["mcp-directory", "hacker-news"]);
  assert.equal(preview.status, "preview_only");
  assert.equal(preview.authentication.credentialsRead, false);
  assert.equal(preview.authentication.credentialsStored, false);
  assert.equal(preview.safety.networkRequests, false);
  assert.equal(preview.safety.externalSideEffects, false);
  assert.deepEqual(preview.publication.platforms.map(item => item.platform), ["mcp-directory", "hacker-news"]);
});

test("community preview requires operator review for every platform", async () => {
  const preview = await previewFor(["reddit"]);
  assert.equal(preview.publication.automaticSubmission, false);
  assert.equal(preview.publication.operatorApprovalRequired, true);
  assert.equal(preview.publication.platforms[0].state, "ready_for_operator_review");
});
