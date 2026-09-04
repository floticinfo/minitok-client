"use strict";

function readEnv(name) {
  return process.env[name];
}

function hasEnv(name) {
  return process.env[name] !== undefined;
}

module.exports = { readEnv, hasEnv };
