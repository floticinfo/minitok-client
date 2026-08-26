"use strict";

/**
 * File Permission Utilities — cross-platform owner-only access.
 *
 * On POSIX: uses fs.chmodSync(0o600) for owner read/write only.
 * On Windows: uses icacls to grant only the current user full control,
 *             removing inherited permissions.
 *
 * These functions are best-effort — permission failures are logged
 * but never crash the application.
 */

const fs = require("fs");
const os = require("os");
const { execSync } = require("child_process");

/**
 * Set a file to owner-only access.
 *
 * @param {string} filePath - Absolute path to the file
 */
function setOwnerOnlyPermissions(filePath) {
  try {
    if (process.platform === "win32") {
      _setWindowsPermissions(filePath);
    } else {
      fs.chmodSync(filePath, 0o600);
    }
  } catch (e) {
    // Best-effort: permission failure must never break the pipeline.
    // On Windows in certain environments (CI, containers), ACL changes
    // may not be possible. The file is still created but with default perms.
    console.warn(`[FilePerms] Could not set owner-only permissions on ${filePath}: ${e.message}`);
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
  const username = os.userInfo().username;

  // Grant only current user full control, remove inheritance
  // On Windows, icacls accepts just the username for local users
  const icacls = `icacls "${filePath}" /inheritance:r /grant:r "${username}:(R,W)"`;
  execSync(icacls, { stdio: "ignore", timeout: 5000 });
}

module.exports = { setOwnerOnlyPermissions };

