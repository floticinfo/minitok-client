"use strict";

class MinitokError extends Error {
  constructor(message) {
    super(message);
    this.name = "MinitokError";
  }
}

class WorkspaceError extends MinitokError {
  constructor(message) {
    super(message);
    this.name = "WorkspaceError";
  }
}

class AuthError extends MinitokError {
  constructor(message) {
    super(message);
    this.name = "AuthError";
  }
}

class ConfigError extends MinitokError {
  constructor(message) {
    super(message);
    this.name = "ConfigError";
  }
}

class PipelineError extends MinitokError {
  constructor(message) {
    super(message);
    this.name = "PipelineError";
  }
}

class AdapterError extends MinitokError {
  constructor(message) {
    super(message);
    this.name = "AdapterError";
  }
}

class MigrationError extends MinitokError {
  constructor(message) {
    super(message);
    this.name = "MigrationError";
  }
}

module.exports = {
  MinitokError,
  WorkspaceError,
  AuthError,
  ConfigError,
  PipelineError,
  AdapterError,
  MigrationError,
};
