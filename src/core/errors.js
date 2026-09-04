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

class GitError extends minitokError {
  constructor(message, options = {}) {
    super(message);
    this.name = "GitError";
    this.code = options.code;
    this.command = options.command;
    this.status = options.status;
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
  GitError,
  MigrationError,
};
