"use strict";

const { checkEntitlementOnline } = require("./online");
const { GateState } = require("./gate");

function applyEntitlementPolicy(result, feature) {
  if (!result || !result.allowed) return result || { allowed: false, state: GateState.MISSING, message: "Entitlement is unavailable." };
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
