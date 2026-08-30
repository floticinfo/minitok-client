"use strict";

/**
 * Implementer — executes code changes based on the plan.
 */

const fs = require("fs");
const path = require("path");
const { auditLog } = require("../core/audit");

/**
 * Files/directories protected from autonomous pipeline modification.
 * These control minitok's own runtime behavior and provider selection.
 */
const PROTECTED_PATHS = ["minitok.yml", ".minitok"];

/**
 * Default blocked file extensions for autonomous pipeline.
 * Configurable via config.security.blocked_extensions.
 */
const DEFAULT_BLOCKED_EXTENSIONS = [".sh", ".bat", ".cmd", ".ps1", ".exe", ".dll", ".so"];

const IMPLEMENT_SYSTEM_PROMPT = `You are an expert software engineer. Given an implementation plan and repository context, produce the exact code changes needed.

Output format (strict JSON):
{
  "changes": [
    {
      "file": "path/to/file",
      "action": "create|modify|delete",
      "content": "full file content for create, or diff description for modify",
      "line_range": "optional: start-end for modifications"
    }
  ],
  "summary": "what was implemented",
  "files_changed": 3
}`;

async function implement(provider, planResult, repoContext, options = {}) {
  const messages = [
    { role: "system", content: IMPLEMENT_SYSTEM_PROMPT },
    {
      role: "user",
      content: `## Plan\n${JSON.stringify(planResult.plan, null, 2)}\n\n## Repository Context\n${repoContext}\n\n## Instructions\n- Produce complete, working code\n- Follow existing code style\n- Include imports and dependencies`,
    },
  ];

  const result = await provider.complete(messages, {
    model: options.model,
    max_tokens: 8192,
    temperature: 0.2,
  });

  const { parseResponseJSON } = require("./json_utils");

  let changes;
  const { parsed, valid } = parseResponseJSON(result.text, { error: "No JSON", raw: result.text });
  changes = valid ? parsed : { error: parsed.error || "Invalid JSON", raw: parsed.raw || result.text };

  return { changes, tokens: result.tokens, model: result.model };
}

/**
 * Resolve and validate a file path stays within repoRoot.
 * Checks both lexical path and symlink/junction target.
 * @param {string} repoRoot
 * @param {string} filePath - relative path from LLM
 * @returns {{ resolved: string, safe: boolean, reason?: string }}
 */
function safePath(repoRoot, filePath) {
  const resolved = path.resolve(repoRoot, filePath);
  const root = path.resolve(repoRoot);

  // Lexical check: resolved path must be under repoRoot
  if (!(resolved === root || resolved.startsWith(root + path.sep))) {
    return { resolved, safe: false, reason: `Path traversal blocked: ${filePath} resolves outside repo` };
  }

  // Symlink/junction check: follow symlinks and verify target is also inside repoRoot
  try {
    const stat = fs.lstatSync(resolved);
    if (stat.isSymbolicLink()) {
      const realTarget = fs.realpathSync(resolved);
      if (!(realTarget === root || realTarget.startsWith(root + path.sep))) {
        return { resolved, safe: false, reason: `Symlink escape blocked: ${filePath} -> ${realTarget}` };
      }
    }
  } catch (e) {
    // ENOENT: file doesn't exist yet — this is fine for create actions
    if (e.code !== "ENOENT") {
      return { resolved, safe: false, reason: `Path check failed: ${filePath}: ${e.message}` };
    }
  }

  return { resolved, safe: true };
}

/**
 * Check if a resolved file path is protected from autonomous modification.
 * @param {string} repoRoot
 * @param {string} filePath - resolved absolute path
 * @returns {{ protected: boolean, reason?: string }}
 */
function isProtectedPath(repoRoot, filePath) {
  const root = path.resolve(repoRoot);
  let rel = path.relative(root, filePath).replace(/\\/g, "/");
  // On Windows/NTFS the filesystem is case-insensitive, normalize for comparison
  if (process.platform === "win32") {
    rel = rel.toLowerCase();
  }
  for (const p of PROTECTED_PATHS) {
    const pat = process.platform === "win32" ? p.toLowerCase() : p;
    if (rel === pat || rel.startsWith(pat + "/")) {
      return { protected: true, reason: `Protected path: ${p}` };
    }
  }
  return { protected: false };
}

/**
 * Check if a file extension is blocked by policy.
 * @param {string} filePath
 * @param {string[]} blockedExtensions
 * @returns {{ blocked: boolean, reason?: string }}
 */
function isBlockedExtension(filePath, blockedExtensions) {
  const ext = path.extname(filePath).toLowerCase();
  if (blockedExtensions.includes(ext)) {
    return { blocked: true, reason: `Blocked extension: ${ext}` };
  }
  return { blocked: false };
}

function applyChanges(repoRoot, changesResult, dryRun = false, options = {}) {
  if (changesResult.error) return { applied: 0, errors: [changesResult.error] };

  // 🔒 Validate LLM output before processing
  const { valid, errors: validationErrors, validatedChanges } = validateChanges(changesResult);
  if (!valid) {
    return { applied: 0, errors: validationErrors };
  }

  const results = { applied: 0, skipped: 0, errors: [] };
  for (const change of validatedChanges) {
    // 🔒 Validate path stays within repoRoot
    const { resolved: filePath, safe, reason } = safePath(repoRoot, change.file);
    if (!safe) {
      auditLog({ action: change.action, file: change.file, result: "rejected", reason }, options.auditPath);
      results.errors.push(reason);
      continue;
    }

    // 🔒 Check protected paths
    const { protected: isProtected, reason: protReason } = isProtectedPath(repoRoot, filePath);
    if (isProtected) {
      auditLog({ action: change.action, file: change.file, result: "rejected", reason: protReason }, options.auditPath);
      results.errors.push(protReason);
      continue;
    }

    // 🔒 Check blocked extensions
    const blockedExtensions = options.blockedExtensions || DEFAULT_BLOCKED_EXTENSIONS;
    const { blocked, reason: extReason } = isBlockedExtension(filePath, blockedExtensions);
    if (blocked) {
      auditLog({ action: change.action, file: change.file, result: "rejected", reason: extReason }, options.auditPath);
      results.errors.push(extReason);
      continue;
    }

    try {
      if (dryRun) {
        results.applied++;
        continue;
      }
      if (change.action === "create") {
        fs.mkdirSync(path.dirname(filePath), { recursive: true });
        fs.writeFileSync(filePath, change.content, "utf-8");
        auditLog({ action: "create", file: change.file, result: "applied" }, options.auditPath);
        results.applied++;
      } else if (change.action === "modify") {
        if (fs.existsSync(filePath)) {
          if (change.content) {
            fs.writeFileSync(filePath, change.content, "utf-8");
          }
          auditLog({ action: "modify", file: change.file, result: "applied" }, options.auditPath);
          results.applied++;
        } else {
          results.errors.push(`File not found: ${change.file}`);
        }
      } else if (change.action === "delete") {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
          auditLog({ action: "delete", file: change.file, result: "applied" }, options.auditPath);
          results.applied++;
        }
      } else {
        results.skipped++;
      }
    } catch (e) {
      results.errors.push(`${change.file}: ${e.message}`);
    }
  }
  return results;
}

/**
 * Validate a single change object from LLM output.
 * @param {any} change
 * @returns {{ valid: boolean, reason?: string }}
 */
function validateChange(change) {
  if (!change || typeof change !== "object") {
    return { valid: false, reason: "Change entry must be an object" };
  }
  if (typeof change.file !== "string" || change.file.trim() === "") {
    return { valid: false, reason: "Change 'file' must be a non-empty string" };
  }
  const validActions = ["create", "modify", "delete"];
  if (!validActions.includes(change.action)) {
    return { valid: false, reason: `Change 'action' must be one of: ${validActions.join(", ")}` };
  }
  if (change.action !== "delete") {
    if (change.content === undefined || change.content === null) {
      return { valid: false, reason: `Change 'content' is required for ${change.action} action` };
    }
    if (typeof change.content !== "string") {
      return { valid: false, reason: "Change 'content' must be a string" };
    }
  }
  return { valid: true };
}

/**
 * Validate an LLM output object before applying changes.
 * @param {object} changesResult - parsed LLM output
 * @returns {{ valid: boolean, errors: string[], validatedChanges: Array }}
 */
function validateChanges(changesResult) {
  if (!changesResult || typeof changesResult !== "object") {
    return { valid: false, errors: ["Changes result must be an object"], validatedChanges: [] };
  }
  if (changesResult.error) {
    return { valid: false, errors: [changesResult.error], validatedChanges: [] };
  }
  if (!Array.isArray(changesResult.changes)) {
    return { valid: false, errors: ["'changes' must be an array"], validatedChanges: [] };
  }
  const errors = [];
  const validated = [];
  for (let i = 0; i < changesResult.changes.length; i++) {
    const { valid, reason } = validateChange(changesResult.changes[i]);
    if (valid) {
      validated.push(changesResult.changes[i]);
    } else {
      errors.push(`Change ${i}: ${reason}`);
    }
  }
  return { valid: errors.length === 0, errors, validatedChanges: validated };
}

module.exports = { implement, applyChanges, safePath, isProtectedPath, isBlockedExtension, validateChange, validateChanges, PROTECTED_PATHS, DEFAULT_BLOCKED_EXTENSIONS, IMPLEMENT_SYSTEM_PROMPT };
