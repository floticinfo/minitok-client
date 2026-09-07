import * as path from "node:path";

export function parseMcpCommand(value: string) {
  const result: string[] = [];
  let token = "";
  let quote: string | undefined;
  let escaped = false;
  for (const character of value.trim()) {
    if (escaped) {
      token += character;
      escaped = false;
    } else if (character === "\\") {
      escaped = true;
    } else if (quote) {
      if (character === quote) quote = undefined;
      else token += character;
    } else if (character === '"' || character === "'") {
      quote = character;
    } else if (/\s/.test(character)) {
      if (token) { result.push(token); token = ""; }
    } else {
      token += character;
    }
  }
  if (escaped) token += "\\";
  if (quote) throw new Error("Unclosed quote in minitok.mcpCommand");
  if (token) result.push(token);
  return result;
}

export function packagedMcpCommand(extensionPath: string, nodePath: string) {
  return [nodePath, path.join(extensionPath, "runtime", "src", "runtime", "stdio-entry.js")];
}
