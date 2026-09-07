"use strict";
const fs = require("fs");
const path = require("path");
const yaml = require("js-yaml");
async function editSettings(repo, rl) { const file = path.join(repo, "minitok.yml"); const config = fs.existsSync(file) ? yaml.load(fs.readFileSync(file, "utf8")) || {} : {}; for (const role of ["plan", "work", "review", "intel"]) { const provider = await new Promise(resolve => rl.question(`${role} provider [${config.roles?.[role]?.provider || "unchanged"}]: `, value => resolve(value.trim()))); if (provider) { const model = await new Promise(resolve => rl.question(`${role} model [${config.roles?.[role]?.model || "default"}]: `, value => resolve(value.trim()))); config.roles = config.roles || {}; config.roles[role] = { ...(config.roles[role] || {}), provider, ...(model ? { model } : {}) }; } } const temporary = `${file}.minitok-tmp`; fs.writeFileSync(temporary, yaml.dump(config), { mode: 0o600 }); fs.renameSync(temporary, file); console.log("Settings updated."); }
module.exports = { editSettings };
