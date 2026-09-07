"use strict";
const { listSessions, getSession, sessionSummary } = require("../../runtime/sessions");

function listAction(opts) {
  const rows = listSessions(opts.repo || process.cwd());
  console.log(opts.json ? JSON.stringify(rows) : rows.map(row => `${row.run_id} ${row.outcome || row.status || "unknown"} ${row.task || ""}`).join("\n"));
}

function showAction(runId, opts) {
  const row = getSession(opts.repo || process.cwd(), runId);
  if (!row) {
    console.error("Run not found");
    process.exitCode = 1;
    return;
  }
  console.log(opts.json ? JSON.stringify(row) : JSON.stringify(row, null, 2));
}

function addRunSubcommands(command) {
  command.command("list").description("List recorded runs").option("--repo <path>").option("--json").action(listAction);
  command.command("show <runId>").description("Show a recorded run").option("--repo <path>").option("--json").action(showAction);
  return command;
}

function register(program) {
  const run = typeof program.command === "function" && program.name && program.name() === "run" ? program : program.commands?.find(command => command.name() === "run");
  if (!run) throw new Error("run command is not registered");
  addRunSubcommands(run);
  const runs = program.command("runs").description("Compatibility aliases for run history commands");
  addRunSubcommands(runs);
}

module.exports = { register, listRuns: listSessions, findRun: getSession, sessionSummary, listAction, showAction };
