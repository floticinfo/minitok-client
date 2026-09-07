"use strict";

const { authorizeEntitlement } = require("../entitlement/policy");

class EntitlementService {
  constructor(entitlementDir) {
    this._dir = entitlementDir;
  }

  status(options = {}) {
    return authorizeEntitlement({ ...options, entitlementDir: this._dir });
  }
}

module.exports = { EntitlementService };
