"use strict";

const { checkEntitlement } = require("../entitlement/gate");

class EntitlementService {
  constructor(entitlementDir) {
    this._dir = entitlementDir;
  }
  
  status() {
    const result = checkEntitlement({ entitlementDir: this._dir });
    return result;
  }
}

module.exports = { EntitlementService };
