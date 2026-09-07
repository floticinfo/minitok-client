"use strict";

const { RuntimeStdio: ProductionStdio } = require("./stdio");
const { RuntimeServer: ProductionServer } = require("./server");

class RuntimeStdio extends ProductionStdio {
  constructor(options = {}) {
    const { authRequired, entitlementRequired, ...safeOptions } = options;
    super(safeOptions);
    if (authRequired === false) this._authRequired = false;
    if (entitlementRequired === false) this._entitlementRequired = false;
  }
}

class RuntimeServer extends ProductionServer {
  constructor(options = {}) {
    const { authRequired, entitlementRequired, ...safeOptions } = options;
    super(safeOptions);
    if (authRequired === false) {
      this._authRequired = false;
      this._mcp._authRequired = false;
      Object.defineProperty(this._mcpOptions, "authRequired", { value: false, configurable: true, writable: true });
    }
    if (entitlementRequired === false) {
      this._entitlementRequired = false;
      this._mcp._entitlementRequired = false;
      Object.defineProperty(this._mcpOptions, "entitlementRequired", { value: false, configurable: true, writable: true });
    }
  }

  _createMcpSession() {
    const safeOptions = { ...this._mcpOptions };
    Reflect.deleteProperty(safeOptions, "authRequired");
    Reflect.deleteProperty(safeOptions, "entitlementRequired");
    const session = new ProductionStdio(safeOptions);
    session._authRequired = this._mcp._authRequired;
    session._entitlementRequired = this._mcp._entitlementRequired;
    return session;
  }
}

module.exports = { RuntimeStdio, RuntimeServer };

