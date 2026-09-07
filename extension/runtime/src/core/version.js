"use strict";

const pkg = require("../../package.json");

const minitokVersion = pkg.version;
const STATE_SCHEMA_VERSION = 1;
const ADAPTER_PROTOCOL_VERSION = 1;

module.exports = {
  minitokVersion,
  STATE_SCHEMA_VERSION,
  ADAPTER_PROTOCOL_VERSION,
};
