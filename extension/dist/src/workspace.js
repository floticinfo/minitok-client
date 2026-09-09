"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.workspacePath = workspacePath;
exports.requireTrustedWorkspace = requireTrustedWorkspace;
exports.cliPath = cliPath;
exports.spawnSpec = spawnSpec;
exports.mcpCommand = mcpCommand;
exports.mcpEnvironment = mcpEnvironment;
exports.mcpAuthToken = mcpAuthToken;
exports.autoApprove = autoApprove;
exports.isCliCompatible = isCliCompatible;
const vscode = __importStar(require("vscode"));
const path = __importStar(require("node:path"));
const fs = __importStar(require("node:fs"));
const os = __importStar(require("node:os"));
const node_child_process_1 = require("node:child_process");
const mcp_1 = require("./mcp");
function workspacePath() {
    const folders = vscode.workspace.workspaceFolders || [];
    if (!folders.length)
        return undefined;
    const active = vscode.window.activeTextEditor?.document.uri;
    if (active) {
        const match = folders.find(folder => active.fsPath === folder.uri.fsPath || active.fsPath.startsWith(`${folder.uri.fsPath}${path.sep}`));
        if (match)
            return match.uri.fsPath;
    }
    return folders[0].uri.fsPath;
}
function requireTrustedWorkspace(cwd) {
    if (!cwd)
        throw new Error("Open a workspace folder before running minitok");
    if (!vscode.workspace.isTrusted)
        throw new Error("Trust this workspace before running minitok");
}
function isNodeCli(candidate) {
    try {
        const version = (0, node_child_process_1.execFileSync)(candidate, ["--version"], { stdio: ["ignore", "pipe", "ignore"], timeout: 10000, windowsHide: true }).toString();
        return /^minitok\s+\d+\.\d+\.\d+/i.test(version) || /^\d+\.\d+\.\d+/.test(version.trim());
    }
    catch {
        return false;
    }
}
function defaultCliPath() {
    const candidates = process.platform === "win32" ? ["minitok.cmd", "minitok"] : ["minitok"];
    for (const candidate of candidates)
        if (isNodeCli(candidate))
            return candidate;
    const npmRoot = process.platform === "win32" ? process.env.APPDATA ? path.join(process.env.APPDATA, "npm") : undefined : undefined;
    const fallback = npmRoot ? path.join(npmRoot, "minitok.cmd") : undefined;
    if (fallback && fs.existsSync(fallback) && isNodeCli(fallback))
        return fallback;
    return candidates[0];
}
function cliPath() {
    const configured = vscode.workspace.getConfiguration("minitok").get("cliPath", "").trim();
    if (configured && isNodeCli(configured))
        return configured;
    return defaultCliPath();
}
function quoteCmdArg(value) { return `"${value.replace(/"/g, '\\"')}"`; }
function spawnSpec(command, args) {
    if (process.platform !== "win32" || !command.toLowerCase().endsWith(".cmd"))
        return { command, args, shell: false };
    const commandLine = ["call", quoteCmdArg(command), ...args.map(quoteCmdArg)].join(" ");
    return { command: process.env.ComSpec || "cmd.exe", args: ["/d", "/s", "/c", commandLine], shell: false };
}
function mcpCommand() {
    const configured = vscode.workspace.getConfiguration("minitok").get("mcpCommand", "");
    if (Array.isArray(configured)) {
        const parsed = configured.filter(value => typeof value === "string" && value.length > 0);
        if (parsed.length)
            return parsed;
    }
    if (typeof configured === "string" && configured.trim()) {
        const parsed = (0, mcp_1.parseMcpCommand)(configured);
        if (parsed.length)
            return parsed;
    }
    return (0, mcp_1.packagedMcpCommand)(path.resolve(__dirname, "../.."), process.execPath);
}
function mcpEnvironment() {
    return { ...process.env, MINITOK_MCP_AUTH_TOKEN_FILE: path.join(os.homedir(), ".minitok", "mcp", "runtime-token.json") };
}
function mcpAuthToken() {
    const tokenFile = mcpEnvironment().MINITOK_MCP_AUTH_TOKEN_FILE;
    try {
        const value = JSON.parse(fs.readFileSync(tokenFile, "utf8"));
        if (typeof value.token !== "string" || !value.token || value.revoked_at || typeof value.expires_at !== "number" || Date.now() >= value.expires_at)
            return undefined;
        return value.token;
    }
    catch {
        return undefined;
    }
}
function autoApprove() {
    return vscode.workspace.getConfiguration("minitok").get("autoApprove", false);
}
function isCliCompatible(version) {
    const match = /^v?(\d+)\.(\d+)\.(\d+)/.exec(version.trim());
    if (!match)
        return false;
    return Number(match[1]) >= 1 && Number(match[2]) >= 3;
}
