"use strict";

/**
 * File Permission Utilities — cross-platform owner-only access.
 *
 * On POSIX: uses fs.chmodSync(0o600) for owner read/write only.
 * On Windows: uses icacls to grant only the current user full control,
 *             removing inherited permissions.
 *
 * These functions enforce owner-only access for credential material.
 */

const fs = require("fs");
const { execFileSync } = require("child_process");

/**
 * Set a file to owner-only access.
 *
 * @param {string} filePath - Absolute path to the file
 */
function setOwnerOnlyPermissions(filePath) {
  if (process.platform === "win32") {
    _setWindowsPermissions(filePath);
  } else {
    fs.chmodSync(filePath, 0o600);
  }
}

/**
 * Windows ACL: grant only current user full control.
 *
 * Uses icacls to:
 * 1. Disable inheritance
 * 2. Remove all inherited ACEs
 * 3. Grant only the current user Full Control
 *
 * This is the closest equivalent to POSIX 0o600 on Windows NTFS.
 */
function _setWindowsPermissions(filePath) {
  const username = execFileSync("whoami", { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"], timeout: 5000 }).trim();
  try {
    execFileSync("icacls", [filePath, "/inheritance:r", "/grant:r", `${username}:F`], { stdio: "ignore", timeout: 5000 });
  } catch {
    try { fs.chmodSync(filePath, 0o600); } catch {}
  }
}

module.exports = { setOwnerOnlyPermissions };

