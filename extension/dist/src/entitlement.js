"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireEntitlement = requireEntitlement;
exports.checkEntitlement = checkEntitlement;
const node_child_process_1 = require("node:child_process");
const workspace_1 = require("./workspace");
async function requireEntitlement() {
    const entitlement = await checkEntitlement();
    if (!entitlement.allowed)
        throw new Error(entitlement.message || "An active paid minitok plan is required.");
    return entitlement;
}
function checkEntitlement() {
    return new Promise(resolve => {
        (0, node_child_process_1.execFile)((0, workspace_1.cliPath)(), ["status", "--json"], { cwd: (0, workspace_1.workspacePath)(), timeout: 30000, windowsHide: true, maxBuffer: 1024 * 1024 }, (error, stdout, stderr) => {
            if (error) {
                resolve({ checked: true, allowed: false, message: stderr || error.message });
                return;
            }
            try {
                const result = JSON.parse(stdout);
                const entitlement = result.entitlement || {};
                const allowed = entitlement.allowed === true && typeof entitlement.plan === "string" && entitlement.plan.length > 0;
                resolve({ checked: true, allowed, plan: entitlement.plan || null, message: allowed ? undefined : "An active paid minitok plan is required." });
            }
            catch (parseError) {
                resolve({ checked: true, allowed: false, message: `Could not verify minitok entitlement: ${parseError instanceof Error ? parseError.message : String(parseError)}` });
            }
        });
    });
}
