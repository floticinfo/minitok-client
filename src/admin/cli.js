"use strict";
const fs = require("fs");
const os = require("os");
const path = require("path");
const { postJson } = require("../core/http");
const { resolveServerUrl } = require("../cli/commands/server-config");
const { setOwnerOnlyPermissions } = require("../utils/file-permissions");

function adminPath() { return path.join(os.homedir(), ".minitok", "admin-token.json"); }
function saveToken(token) { const file = adminPath(); fs.mkdirSync(path.dirname(file), { recursive: true }); const tmp = `${file}.${process.pid}.tmp`; fs.writeFileSync(tmp, JSON.stringify({ token, saved_at: new Date().toISOString() }), { mode: 0o600 }); fs.renameSync(tmp, file); setOwnerOnlyPermissions(file); }
function loadToken() { try { return JSON.parse(fs.readFileSync(adminPath(), "utf8")).token || null; } catch { return null; } }
function removeToken() { try { fs.unlinkSync(adminPath()); } catch {} }
async function request(endpoint, body, server, headers) { return postJson(`${resolveServerUrl({ cliServer: server })}${endpoint}`, body, 30000, headers); }
async function cmdAdminBootstrap(options) { const result = await request("/v1/admin/bootstrap", { token: options.token, email: options.email, password: options.password }, options.server); if (!result.ok || !result.body?.token) { console.error("Admin bootstrap failed"); return 1; } saveToken(result.body.token); console.log("Admin bootstrap successful"); return 0; }
async function cmdAdminLogin(options) { const result = await request("/v1/admin/login", { email: options.email, password: options.password }, options.server); if (!result.ok || !result.body?.token) { console.error("Admin login failed"); return 1; } saveToken(result.body.token); console.log("Admin login successful"); return 0; }
async function cmdAdminLogout(options) { const token = loadToken(); if (token) await request("/v1/admin/logout", {}, options.server, { Authorization: `Bearer ${token}` }); removeToken(); console.log("Admin logout successful"); return 0; }
function register(program) { const admin = program.command("admin").description("Private administrator CLI"); admin.command("bootstrap").requiredOption("--token <token>").requiredOption("--email <email>").requiredOption("--password <password>").option("--server <url>").action(async o => process.exit(await cmdAdminBootstrap(o))); admin.command("login").requiredOption("--email <email>").requiredOption("--password <password>").option("--server <url>").action(async o => process.exit(await cmdAdminLogin(o))); admin.command("logout").option("--server <url>").action(async o => process.exit(await cmdAdminLogout(o))); }
module.exports = { register, cmdAdminBootstrap, cmdAdminLogin, cmdAdminLogout, adminPath };
