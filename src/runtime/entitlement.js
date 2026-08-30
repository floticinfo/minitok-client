"use strict";

const { checkEntitlementOnline } = require("../entitlement/online");

class EntitlementService {
  constructor(entitlementDir) {
    this._dir = entitlementDir;
  }

  status(options = {}) {
    return checkEntitlementOnline({ ...options, entitlementDir: this._dir });
  }
}

module.exports = { EntitlementService };
