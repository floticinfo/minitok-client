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
exports.minitokPanel = void 0;
const vscode = __importStar(require("vscode"));
const fs = __importStar(require("node:fs"));
const path = __importStar(require("node:path"));
const node_child_process_1 = require("node:child_process");
const node_crypto_1 = require("node:crypto");
const workspace_1 = require("./workspace");
const entitlement_1 = require("./entitlement");
function runCli(cliPath, args, cwd, onProcess) {
    return new Promise((resolve, reject) => {
        const child = (0, node_child_process_1.spawn)(cliPath, args, { cwd, shell: false, windowsHide: true, detached: process.platform !== "win32" });
        onProcess(child);
        let stdout = "";
        let stderr = "";
        const timeout = setTimeout(() => {
            if (process.platform === "win32") {
                try {
                    (0, node_child_process_1.execFileSync)("taskkill", ["/pid", String(child.pid), "/t", "/f"], { windowsHide: true, timeout: 10000 });
                }
                catch {
                    child.kill();
                }
            }
            else {
                try {
                    process.kill(-child.pid, "SIGTERM");
                }
                catch {
                    child.kill("SIGTERM");
                }
            }
        }, 1800000);
        child.stdout.on("data", chunk => { stdout += chunk.toString(); });
        child.stderr.on("data", chunk => { stderr += chunk.toString(); });
        child.on("error", error => { clearTimeout(timeout); reject(error); });
        child.on("close", code => { clearTimeout(timeout); onProcess(undefined); if (code === 0)
            resolve(stdout);
        else
            reject(new Error(stderr || stdout || `minitok exited with code ${code}`)); });
    });
}
class minitokPanel {
    static current;
    panel;
    extensionUri;
    disposables = [];
    process;
    static createOrShow(context) {
        if (minitokPanel.current) {
            minitokPanel.current.panel.reveal();
            return;
        }
        const panel = vscode.window.createWebviewPanel("minitok", "minitok", vscode.ViewColumn.Beside, { enableScripts: true, retainContextWhenHidden: true });
        minitokPanel.current = new minitokPanel(panel, context.extensionUri);
    }
    constructor(panel, extensionUri) {
        this.panel = panel;
        this.extensionUri = extensionUri;
        this.panel.webview.html = this.html();
        this.panel.webview.onDidReceiveMessage(message => this.handle(message), null, this.disposables);
        this.panel.onDidDispose(() => { minitokPanel.current = undefined; this.dispose(); }, null, this.disposables);
    }
    async handle(message) {
        if (!message || !["status", "run", "dry-run", "stop"].includes(message.command)) {
            this.post(false, "Unsupported command");
            return;
        }
        if (message.task !== undefined && (typeof message.task !== "string" || message.task.length > 20000)) {
            this.post(false, "Task is invalid or too long");
            return;
        }
        const cwd = (0, workspace_1.workspacePath)();
        const cli = (0, workspace_1.cliPath)();
        try {
            if (message.command === "stop") {
                this.stopProcess();
                this.post(true, "Run stopped.");
                return;
            }
            await (0, entitlement_1.requireEntitlement)();
            if (message.command === "status")
                this.post(true, await runCli(cli, ["status"], cwd, child => { this.process = child; }));
            else {
                (0, workspace_1.requireTrustedWorkspace)(cwd);
                if (!message.task?.trim())
                    throw new Error("Task description required");
                if (this.process)
                    throw new Error("A minitok run is already active");
                const args = ["run", message.task];
                if (message.command === "dry-run")
                    args.push("--dry-run");
                else if ((0, workspace_1.autoApprove)())
                    args.push("--auto-accept");
                else {
                    const answer = await vscode.window.showWarningMessage("Allow minitok to modify this workspace?", "Approve", "Cancel");
                    if (answer !== "Approve")
                        return;
                }
                const output = await runCli(cli, args, cwd, child => { this.process = child; });
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
        catch (error) {
            if (error.code === "ENOENT")
                return null;
            throw new Error(`Evidence could not be read: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    stopProcess() {
        const child = this.process;
        if (!child || child.killed)
            return;
        if (process.platform === "win32") {
            try {
                (0, node_child_process_1.execFileSync)("taskkill", ["/pid", String(child.pid), "/t", "/f"], { windowsHide: true, timeout: 10000 });
            }
            catch {
                child.kill();
            }
        }
        else {
            try {
                process.kill(-child.pid, "SIGTERM");
            }
            catch {
                child.kill("SIGTERM");
            }
        }
    }
    post(ok, text) { this.panel.webview.postMessage({ ok, text }); }
    html() { const nonce = (0, node_crypto_1.randomBytes)(16).toString("base64"); const source = fs.readFileSync(path.join(this.extensionUri.fsPath, "src", "panel.html"), "utf8"); return source.replaceAll("{{nonce}}", nonce).replace("{{cspSource}}", this.panel.webview.cspSource); }
    dispose() { this.stopProcess(); while (this.disposables.length)
        this.disposables.pop()?.dispose(); this.panel.dispose(); }
}
exports.minitokPanel = minitokPanel;
