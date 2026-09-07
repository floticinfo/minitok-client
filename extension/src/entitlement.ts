import { execFile } from "node:child_process";
import { cliPath, workspacePath } from "./workspace";

export type EntitlementState = { checked: boolean; allowed: boolean; plan?: string | null; message?: string };

export async function requireEntitlement(): Promise<EntitlementState> {
  const entitlement = await checkEntitlement();
  if (!entitlement.allowed) throw new Error(entitlement.message || "An active paid minitok plan is required.");
  return entitlement;
}

export function checkEntitlement(): Promise<EntitlementState> {
  return new Promise(resolve => {
    execFile(cliPath(), ["status", "--json"], { cwd: workspacePath(), timeout: 30000, windowsHide: true, maxBuffer: 1024 * 1024 }, (error, stdout, stderr) => {
      if (error) { resolve({ checked: true, allowed: false, message: stderr || error.message }); return; }
      try {
        const result = JSON.parse(stdout);
        const entitlement = result.entitlement || {};
        const allowed = entitlement.allowed === true && typeof entitlement.plan === "string" && entitlement.plan.length > 0;
        resolve({ checked: true, allowed, plan: entitlement.plan || null, message: allowed ? undefined : "An active paid minitok plan is required." });
      } catch (parseError) {
        resolve({ checked: true, allowed: false, message: `Could not verify minitok entitlement: ${parseError instanceof Error ? parseError.message : String(parseError)}` });
      }
    });
  });
}
