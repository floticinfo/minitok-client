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
exports.readExtensionSession = readExtensionSession;
exports.refreshExtensionSession = refreshExtensionSession;
exports.deviceLogin = deviceLogin;
exports.logoutExtension = logoutExtension;
exports.authErrorText = authErrorText;
const vscode = __importStar(require("vscode"));
const SESSION_KEY = "minitok.secret.accountSession";
const DEFAULT_SERVER = "https://api.minitok.dev";
function serverUrl() {
    const configured = vscode.workspace.getConfiguration("minitok").get("serverUrl", DEFAULT_SERVER).trim();
    return configured.replace(/\/$/, "");
}
function expiry(session) {
    return session.expires_at || (Number.isFinite(Number(session.expires_in)) ? new Date(Date.now() + Number(session.expires_in) * 1000).toISOString() : undefined);
}
async function request(path, body) {
    let response;
    try {
        response = await fetch(`${serverUrl()}${path}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    }
    catch (error) {
        throw Object.assign(new Error(error instanceof Error ? error.message : String(error)), { kind: "network" });
    }
    let value = null;
    try {
        value = await response.json();
    }
    catch { }
    if (!response.ok) {
        const error = new Error(value?.error || `Authentication request failed (${response.status})`);
        Object.assign(error, { kind: response.status >= 500 ? "network" : "login" });
        throw error;
    }
    return value;
}
async function readExtensionSession(context) {
    const raw = await context.secrets.get(SESSION_KEY);
    if (!raw)
        return undefined;
    try {
        return JSON.parse(raw);
    }
    catch {
        await context.secrets.delete(SESSION_KEY);
        return undefined;
    }
}
async function save(context, session) {
    await context.secrets.store(SESSION_KEY, JSON.stringify({ ...session, expires_at: expiry(session) }));
}
async function refreshExtensionSession(context) {
    const session = await readExtensionSession(context);
    if (!session?.refresh_token)
        return undefined;
    const expiresAt = session.expires_at ? Date.parse(session.expires_at) : 0;
    if (expiresAt > Date.now() + 60000)
        return session;
    try {
        const next = await request("/v1/auth/token/refresh", { refresh_token: session.refresh_token });
        await save(context, next);
        return next;
    }
    catch {
        return undefined;
    }
}
async function deviceLogin(context, onStatus) {
    let start;
    try {
        start = await request("/v1/auth/device/authorize", { client_id: "minitok-extension" });
    }
    catch (error) {
        throw Object.assign(error instanceof Error ? error : new Error(String(error)), { kind: "network" });
    }
    const verificationUrl = start.verification_uri_complete || start.verification_uri;
    onStatus(`Waiting for browser authorization at ${start.verification_uri}`);
    await vscode.env.openExternal(vscode.Uri.parse(verificationUrl));
    const deadline = Date.now() + Math.min(Number(start.expires_in || 600) * 1000, 10 * 60 * 1000);
    const interval = Math.max(2000, Number(start.interval || 5) * 1000);
    while (Date.now() < deadline) {
        await new Promise(resolve => setTimeout(resolve, interval));
        try {
            const result = await request("/v1/auth/device/token", { device_code: start.device_code });
            if (result.access_token && result.refresh_token) {
                await save(context, result);
                return result;
            }
        }
        catch (error) {
            if (error?.message === "authorization_pending")
                continue;
            throw Object.assign(error instanceof Error ? error : new Error(String(error)), { kind: error?.kind || "login" });
        }
    }
    throw Object.assign(new Error("Browser authorization timed out."), { kind: "login" });
}
async function logoutExtension(context) {
    const session = await readExtensionSession(context);
    if (session?.refresh_token) {
        try {
            await request("/v1/auth/logout", { refresh_token: session.refresh_token });
        }
        catch { }
    }
    await context.secrets.delete(SESSION_KEY);
}
function authErrorText(error) {
    const kind = error?.kind || "login";
    if (kind === "network")
        return `Network error: ${error.message || "Unable to reach minitok."}`;
    if (kind === "entitlement")
        return `Entitlement error: ${error.message || "An active entitlement is required."}`;
    return `Login failed: ${error.message || "Browser authorization was not completed."}`;
}
