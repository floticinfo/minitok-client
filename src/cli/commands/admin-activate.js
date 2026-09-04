"use strict";

const { randomUUID } = require("crypto");
const { postJson } = require("../../core/http");
const fs = require("fs");
const path = require("path");
const { EntitlementStore, DEFAULT_ENTITLEMENT_DIR } = require("../../entitlement/store");
const { saveGateState } = require("../../entitlement/gate");
const { resolveServerUrl } = require("./server-config");

async function cmdAdminActivate(opts = {}) {
  const operatorKey = opts.operatorKey || process.env.minitok_operator_key;
  if (!operatorKey) {
    console.error("Error: minitok_operator_key is required.");
    return 1;
  }
  const installationId = randomUUID();
  const planId = opts.plan || "open";
  const serverUrl = resolveServerUrl({ cliServer: opts.server });
  let result;
  try {
    result = await post(`${serverUrl}/v1/operator/entitlement`, {
      installation_id: installationId,
      planId,
      validityDays: Number(opts.validityDays || 3650),
      hostname: require("os").hostname(),
    }, { Authorization: `Bearer ${operatorKey}` });
  } catch (error) {
    console.error(`Error: Cannot connect to server at ${serverUrl}\n${error.message}`);
    return 1;
  }
  if (!result.ok || !result.body?.entitlement || !result.body?.installation_token) {
    console.error(`Error: ${result.body?.error || "Administrator activation failed"}`);
    return 1;
  }
  const store = new EntitlementStore();
  store.save(result.body.entitlement);
  fs.mkdirSync(DEFAULT_ENTITLEMENT_DIR, { recursive: true });
  const tokenFile = path.join(DEFAULT_ENTITLEMENT_DIR, "installation-token.json");
  const tokenRecord = { token: result.body.installation_token, installation_id: installationId, saved_at: new Date().toISOString() };
  const tmp = `${tokenFile}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(tokenRecord, null, 2), { encoding: "utf8", mode: 0o600 });
  fs.renameSync(tmp, tokenFile);
  saveGateState({ latest_observed_at: Date.now(), last_validated_at: new Date().toISOString() });
  console.log(`Administrator activation successful: ${planId}`);
  return 0;
}

function post(urlString, body, headers) {
  return postJson(urlString, body, 30000, headers);
}

module.exports = { cmdAdminActivate };
