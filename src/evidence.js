'use strict';

const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');

const MAX = 2000;
const ID = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/;
const SECRET = /(api[_-]?key|authorization|bearer|credential|password|passwd|secret|token|prompt|private[_-]?key|access[_-]?key)/i;
const error = message => new TypeError(`Invalid run evidence: ${message}`);

function text(value, field, max = MAX) {
  if (typeof value !== 'string' || !value.trim()) throw error(`${field} must be a non-empty string`);
  const result = value.trim();
  if (result.length > max) throw error(`${field} is too long`);
  if (SECRET.test(field) || (field === 'task' && SECRET.test(result))) throw error(`${field} is not permitted`);
  return result;
}
function array(value, field) {
  if (!Array.isArray(value) || value.length > 100) throw error(`${field} must be an array`);
  return value.map((v, i) => text(v, `${field}[${i}]`));
}
function sanitizeEvidence(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw error('record must be an object');
  const allowed = ['runId','timestamp','dryRun','task','stages','changedFiles','verification','outcome'];
  if (Object.keys(input).some(k => !allowed.includes(k))) throw error('record contains unsupported or sensitive fields');
  if (typeof input.dryRun !== 'boolean') throw error('dryRun must be a boolean');
  const runId = text(input.runId, 'runId');
  if (!ID.test(runId)) throw error('runId contains unsafe characters');
  const timestamp = new Date(text(input.timestamp, 'timestamp')).toISOString();
  const stages = input.stages || {};
  if (!stages || typeof stages !== 'object' || Array.isArray(stages)) throw error('stages must be an object');
  return {
    runId, timestamp, dryRun: input.dryRun, task: text(input.task, 'task'),
    stages: { plan: input.stages.plan === undefined ? [] : array(input.stages.plan, 'stages.plan'), work: input.stages.work === undefined ? [] : array(input.stages.work, 'stages.work'), review: input.stages.review === undefined ? [] : array(input.stages.review, 'stages.review') },
    changedFiles: array(input.changedFiles || [], 'changedFiles'),
    verification: (input.verification || []).map((v, i) => { if (!v || typeof v !== 'object' || typeof v.command !== 'string') throw error(`verification[${i}].command is invalid`); if (!Number.isInteger(v.exitStatus) || v.exitStatus < 0 || v.exitStatus > 255) throw error(`verification[${i}].exitStatus is invalid`); return { command: text(v.command, `verification[${i}].command`, 4000), exitStatus: v.exitStatus }; }),
    outcome: text(input.outcome, 'outcome'),
  };
}
async function atomic(file, value) {
  const tmp = path.join(path.dirname(file), `.${path.basename(file)}.${process.pid}.${crypto.randomBytes(6).toString('hex')}.tmp`);
  try { await fs.writeFile(tmp, `${JSON.stringify(value, null, 2)}\n`, { encoding: 'utf8', flag: 'wx' }); await fs.rename(tmp, file); } catch (e) { await fs.rm(tmp, { force: true }).catch(() => {}); throw e; }
}
async function writeEvidence(input, options = {}) {
  const record = sanitizeEvidence(input); const dir = path.resolve(options.evidenceDirectory || path.join(options.workspaceRoot || process.cwd(), '.minitok', 'evidence', 'runs'));
  try { await fs.mkdir(dir, { recursive: true }); await atomic(path.join(dir, `${record.runId}.json`), record); await atomic(path.join(dir, 'latest.json'), record); } catch { throw new Error('Unable to write run evidence; check the local evidence directory and permissions.'); }
  return record;
}
module.exports = { sanitizeEvidence, writeEvidence };
