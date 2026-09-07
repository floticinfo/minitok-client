import * as vscode from "vscode";
import * as path from "node:path";
import * as fs from "node:fs";
import * as os from "node:os";
import { execFileSync } from "node:child_process";
import { packagedMcpCommand, parseMcpCommand } from "./mcp";

export function workspacePath() {
  const folders = vscode.workspace.workspaceFolders || [];
  if (!folders.length) return undefined;
  const active = vscode.window.activeTextEditor?.document.uri;
  if (active) {
    const match = folders.find(folder => active.fsPath === folder.uri.fsPath || active.fsPath.startsWith(`${folder.uri.fsPath}${path.sep}`));
    if (match) return match.uri.fsPath;
  }
  return folders[0].uri.fsPath;
}

export function requireTrustedWorkspace(cwd?: string) {
  if (!cwd) throw new Error("Open a workspace folder before running minitok");
  if (!vscode.workspace.isTrusted) throw new Error("Trust this workspace before running minitok");
}

function isNodeCli(candidate: string) {
  try {
    const version = execFileSync(candidate, ["--version"], { stdio: ["ignore", "pipe", "ignore"], timeout: 10000, windowsHide: true }).toString();
    return /^minitok\s+\d+\.\d+\.\d+/i.test(version) || /^\d+\.\d+\.\d+/.test(version.trim());
  } catch { return false; }
}

function defaultCliPath() {
  const candidates = process.platform === "win32" ? ["minitok.cmd", "minitok"] : ["minitok"];
  for (const candidate of candidates) if (isNodeCli(candidate)) return candidate;
  const npmRoot = process.platform === "win32" ? process.env.APPDATA ? path.join(process.env.APPDATA, "npm") : undefined : undefined;
  const fallback = npmRoot ? path.join(npmRoot, "minitok.cmd") : undefined;
  if (fallback && fs.existsSync(fallback) && isNodeCli(fallback)) return fallback;
  return candidates[0];
}

export function cliPath() {
  const configured = vscode.workspace.getConfiguration("minitok").get<string>("cliPath", "").trim();
  if (configured && isNodeCli(configured)) return configured;
  return defaultCliPath();
}

export function mcpCommand() {
  const configured = vscode.workspace.getConfiguration("minitok").get<string | string[]>("mcpCommand", "");
  if (Array.isArray(configured)) return configured.filter(value => typeof value === "string" && value.length > 0);
  if (typeof configured === "string" && configured.trim()) return parseMcpCommand(configured);
  return packagedMcpCommand(path.resolve(__dirname, "../.."), process.execPath);
}

export function mcpEnvironment() {
  return { ...process.env, MINITOK_MCP_AUTH_TOKEN_FILE: path.join(os.homedir(), ".minitok", "entitlement", "installation-token.json") };
}

export function mcpAuthToken() {
  const tokenFile = mcpEnvironment().MINITOK_MCP_AUTH_TOKEN_FILE;
  try {
    const value = JSON.parse(fs.readFileSync(tokenFile, "utf8")) as { token?: unknown };
    return typeof value.token === "string" ? value.token : undefined;
  } catch { return undefined; }
}

export function autoApprove() {
  return vscode.workspace.getConfiguration("minitok").get<boolean>("autoApprove", false);
}

export function isCliCompatible(version: string) {
  const match = /^v?(\d+)\.(\d+)\.(\d+)/.exec(version.trim());
  if (!match) return false;
  return Number(match[1]) >= 1 && Number(match[2]) >= 3;
}
