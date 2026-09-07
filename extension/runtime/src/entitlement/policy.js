"use strict";

const { checkEntitlementOnline } = require("./online");
const { GateState } = require("./gate");
const { VALID_PLAN_IDS } = require("./model");

function applyEntitlementPolicy(result, feature) {
  if (!result || !result.allowed) return result || { allowed: false, state: GateState.MISSING, message: "Entitlement is unavailable." };
  if (!VALID_PLAN_IDS.includes(result.entitlement?.plan_id)) {
    return { ...result, allowed: false, state: GateState.SERVER_REJECTED, message: "A paid entitlement is required." };
  }
  if (feature && !result.entitlement?.features?.includes(feature)) {
    return { ...result, allowed: false, state: GateState.SERVER_REJECTED, message: `Required entitlement feature '${feature}' is unavailable.` };
  }
  return result;
}

async function authorizeEntitlement(options = {}) {
  const result = await checkEntitlementOnline(options);
  return applyEntitlementPolicy(result, options.feature);
}

module.exports = { authorizeEntitlement, applyEntitlementPolicy };
