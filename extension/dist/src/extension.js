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
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = __importStar(require("vscode"));
const node_child_process_1 = require("node:child_process");
const panel_1 = require("./panel");
const sidebar_1 = require("./sidebar");
const workspace_1 = require("./workspace");
const entitlement_1 = require("./entitlement");
function extensionVersion(context) {
    return String(context.extension.packageJSON.version);
}
function runCli(cliPath, args) {
    return new Promise((resolve, reject) => {
        (0, node_child_process_1.execFile)(cliPath, args, { cwd: (0, workspace_1.workspacePath)(), timeout: 1800000, windowsHide: true }, (error, stdout, stderr) => {
            if (error)
                reject(new Error(stderr || error.message));
            else
                resolve(stdout);
        });
    });
}
function activate(context) {
    const output = vscode.window.createOutputChannel("minitok");
    void (0, entitlement_1.checkEntitlement)().then(result => { if (!result.allowed)
        vscode.window.showWarningMessage(result.message || "An active paid minitok plan is required."); });
    const requireEntitlement = async () => {
        const entitlement = await (0, entitlement_1.checkEntitlement)();
        if (!entitlement.allowed)
            throw new Error(entitlement.message || "An active paid minitok plan is required.");
    };
    context.subscriptions.push(output);
    const sidebar = new sidebar_1.minitokSidebar(context.extensionUri, context);
    context.subscriptions.push(sidebar, vscode.window.registerWebviewViewProvider(sidebar_1.minitokSidebar.viewType, sidebar));
    context.subscriptions.push(vscode.commands.registerCommand("minitok.openPanel", () => panel_1.minitokPanel.createOrShow(context)));
    context.subscriptions.push(vscode.commands.registerCommand("minitok.openSettings", () => vscode.commands.executeCommand("workbench.action.openSettings", "@ext:flotic.minitok-extension")));
    context.subscriptions.push(vscode.commands.registerCommand("minitok.mcpStatus", async () => {
        try {
            await requireEntitlement();
        }
        catch (error) {
            vscode.window.showErrorMessage(String(error));
            return;
        }
        output.show(true);
        const command = (0, workspace_1.mcpCommand)();
        const child = (0, node_child_process_1.spawn)(command[0], command.slice(1), { cwd: (0, workspace_1.workspacePath)(), env: (0, workspace_1.mcpEnvironment)(), shell: false, windowsHide: true });
        let buffer = "";
        const finish = (text) => { child.kill(); output.appendLine(text); vscode.window.showInformationMessage(text); };
        const timer = setTimeout(() => finish("minitok MCP handshake timed out"), 5000);
        child.stdout.on("data", (chunk) => { buffer += chunk.toString(); const lines = buffer.split(/\r?\n/); buffer = lines.pop() || ""; for (const line of lines) {
            try {
                const message = JSON.parse(line);
                if (message.error) {
                    clearTimeout(timer);
                    finish(`minitok MCP error: ${message.error.message}`);
                }
                else if (message.id === 1)
                    child.stdin.write(`${JSON.stringify({ jsonrpc: "2.0", id: 2, method: "tools/list", params: { authToken: (0, workspace_1.mcpAuthToken)() } })}\n`);
                else if (message.id === 2) {
                    clearTimeout(timer);
                    finish(`minitok MCP online: ${message.result?.tools?.length || 0} tools`);
                }
            }
            catch { }
        } });
        child.on("error", (error) => { clearTimeout(timer); finish(`minitok MCP offline: ${error.message}`); });
        child.stdin.write(`${JSON.stringify({ jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2024-11-05", capabilities: {}, clientInfo: { name: "minitok-extension", version: extensionVersion(context) }, authToken: (0, workspace_1.mcpAuthToken)() } })}\n`);
    }));
    context.subscriptions.push(vscode.commands.registerCommand("minitok.run", async () => {
        try {
            await requireEntitlement();
        }
        catch (error) {
            vscode.window.showErrorMessage(String(error));
            return;
        }
        const task = await vscode.window.showInputBox({ prompt: "minitok task" });
        if (!task)
            return;
        if (!(0, workspace_1.workspacePath)()) {
            vscode.window.showErrorMessage("Open a workspace folder before running minitok");
            return;
        }
        if (!vscode.workspace.isTrusted) {
            vscode.window.showErrorMessage("Trust this workspace before running minitok");
            return;
        }
        const autoApproveSetting = (0, workspace_1.autoApprove)();
        if (!autoApproveSetting) {
            const answer = await vscode.window.showWarningMessage("Allow minitok to modify this workspace?", "Approve", "Cancel");
            if (answer !== "Approve")
                return;
        }
        output.show(true);
        try {
            output.appendLine(await runCli((0, workspace_1.cliPath)(), ["run", task, ...(autoApproveSetting ? ["--auto-accept"] : [])]));
        }
        catch (error) {
            output.appendLine(String(error));
            vscode.window.showErrorMessage("minitok task failed");
        }
    }));
    context.subscriptions.push(vscode.commands.registerCommand("minitok.status", async () => {
        output.show(true);
        try {
            await requireEntitlement();
            const version = await runCli((0, workspace_1.cliPath)(), ["--version"]);
            if (!(0, workspace_1.isCliCompatible)(version))
                throw new Error(`Unsupported minitok CLI version: ${version.trim()}`);
            output.appendLine(await runCli((0, workspace_1.cliPath)(), ["status"]));
        }
        catch (error) {
            output.appendLine(String(error));
        }
    }));
}
function deactivate() { }
