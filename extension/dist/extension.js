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
function runCli(cliPath, args) {
    return new Promise((resolve, reject) => {
        (0, node_child_process_1.execFile)(cliPath, args, { cwd: vscode.workspace.workspaceFolders?.[0]?.uri.fsPath }, (error, stdout, stderr) => {
            if (error)
                reject(new Error(stderr || error.message));
            else
                resolve(stdout);
        });
    });
}
function activate(context) {
    const output = vscode.window.createOutputChannel("minitok");
    const cliPath = () => vscode.workspace.getConfiguration("minitok").get("cliPath", "minitok");
    context.subscriptions.push(vscode.commands.registerCommand("minitok.openPanel", () => panel_1.MinitokPanel.createOrShow(context)));
    context.subscriptions.push(vscode.commands.registerCommand("minitok.run", async () => {
        const task = await vscode.window.showInputBox({ prompt: "minitok task" });
        if (!task)
            return;
        output.show(true);
        try {
            output.appendLine(await runCli(cliPath(), ["run", task, "--auto-accept"]));
        }
        catch (error) {
            output.appendLine(String(error));
            vscode.window.showErrorMessage("minitok task failed");
        }
    }));
    context.subscriptions.push(vscode.commands.registerCommand("minitok.status", async () => {
        output.show(true);
        try {
            output.appendLine(await runCli(cliPath(), ["status"]));
        }
        catch (error) {
            output.appendLine(String(error));
        }
    }));
}
function deactivate() { }
