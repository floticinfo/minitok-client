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
exports.MinitokPanel = void 0;
const vscode = __importStar(require("vscode"));
const fs = __importStar(require("node:fs"));
const path = __importStar(require("node:path"));
const node_child_process_1 = require("node:child_process");
function runCli(cliPath, args, cwd) {
    return new Promise((resolve, reject) => (0, node_child_process_1.execFile)(cliPath, args, { cwd }, (error, stdout, stderr) => error ? reject(new Error(stderr || error.message)) : resolve(stdout)));
}
class MinitokPanel {
    static current;
    panel;
    extensionUri;
    disposables = [];
    static createOrShow(context) {
        if (MinitokPanel.current) {
            MinitokPanel.current.panel.reveal();
            return;
        }
        const panel = vscode.window.createWebviewPanel("minitok", "minitok", vscode.ViewColumn.Beside, { enableScripts: true, retainContextWhenHidden: true });
        MinitokPanel.current = new MinitokPanel(panel, context.extensionUri);
    }
    constructor(panel, extensionUri) {
        this.panel = panel;
        this.extensionUri = extensionUri;
        this.panel.webview.html = this.html();
        this.panel.webview.onDidReceiveMessage(message => this.handle(message), null, this.disposables);
        this.panel.onDidDispose(() => { MinitokPanel.current = undefined; this.dispose(); }, null, this.disposables);
    }
    async handle(message) {
        const cwd = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
        const cli = vscode.workspace.getConfiguration("minitok").get("cliPath", "minitok");
        try {
            if (message.command === "status")
                this.post(true, await runCli(cli, ["status"], cwd));
            else {
                if (!message.task?.trim())
                    throw new Error("Task description required");
                const args = ["run", message.task];
                if (message.command === "dry-run")
                    args.push("--dry-run");
                const output = await runCli(cli, args, cwd);
                const evidence = cwd ? this.readEvidence(cwd) : null;
                this.post(true, `${output}\n${evidence ? `Evidence: ${JSON.stringify(evidence, null, 2)}` : "Evidence unavailable"}`);
            }
        }
        catch (error) {
            this.post(false, String(error));
        }
    }
    readEvidence(cwd) {
        const file = path.join(cwd, ".minitok", "evidence", "runs", "latest.json");
        try {
            return JSON.parse(fs.readFileSync(file, "utf8"));
        }
        catch {
            return null;
        }
    }
    post(ok, text) { this.panel.webview.postMessage({ ok, text }); }
    html() { const nonce = String(Date.now()); const source = fs.readFileSync(path.join(this.extensionUri.fsPath, "src", "panel.html"), "utf8"); return source.replaceAll("{{nonce}}", nonce).replace("{{cspSource}}", this.panel.webview.cspSource); }
    dispose() { while (this.disposables.length)
        this.disposables.pop()?.dispose(); this.panel.dispose(); }
}
exports.MinitokPanel = MinitokPanel;
