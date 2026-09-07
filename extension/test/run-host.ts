import * as path from "node:path";
import { runTests } from "@vscode/test-electron";

const extensionDevelopmentPath = path.resolve(__dirname, "..", "..");
const extensionTestsPath = path.resolve(__dirname, "extension-host.js");
runTests({ extensionDevelopmentPath, extensionTestsPath, launchArgs: ["--disable-extensions"] }).catch(error => { console.error(error); process.exit(1); });
