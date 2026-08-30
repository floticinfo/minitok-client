"use strict";

class minitokError extends Error {
  constructor(message) {
    super(message);
    this.name = "minitokError";
  }
}

class WorkspaceError extends minitokError {
  constructor(message) {
    super(message);
    this.name = "WorkspaceError";
  }
}

class AuthError extends minitokError {
  constructor(message) {
    super(message);
    this.name = "AuthError";
  }
}

class ConfigError extends minitokError {
  constructor(message) {
    super(message);
    this.name = "ConfigError";
  }
}

class PipelineError extends minitokError {
  constructor(message) {
    super(message);
    this.name = "PipelineError";
  }
}

class AdapterError extends minitokError {
  constructor(message) {
    super(message);
    this.name = "AdapterError";
  }
}

class MigrationError extends minitokError {
  constructor(message) {
    super(message);
    this.name = "MigrationError";
  }
}

module.exports = {
  minitokError,
  WorkspaceError,
  AuthError,
  ConfigError,
  PipelineError,
  AdapterError,
  MigrationError,
};
