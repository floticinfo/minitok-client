'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { sanitizeEvidence, writeEvidence } = require('./evidence');

function validRecord(overrides = {}) {
  return {
    runId: 'run-20250101-120000',
    timestamp: '2025-01-01T12:00:00.000Z',
    dryRun: true,
    task: 'Implement local evidence',
    stages: {
      plan: ['selected plan stage'],
      work: ['selected work stage'],
      review: ['selected review stage'],
    },
    changedFiles: ['src/evidence.js'],
    verification: [{ command: 'npm test', exitStatus: 0 }],
    outcome: 'completed',
    ...overrides,
  };
}

async function temporaryDirectory() {
  return fs.mkdtemp(path.join(os.tmpdir(), 'minitok-evidence-'));
}

 test('sanitizes and returns a complete valid record', () => {
  const record = sanitizeEvidence(validRecord());
  assert.deepEqual(record, validRecord());
});

test('rejects missing, malformed, and unsupported fields', () => {
  assert.throws(() => sanitizeEvidence({}), /Invalid run evidence/);
  assert.throws(() => sanitizeEvidence(validRecord({ dryRun: 'true' })), /dryRun/);
  assert.throws(() => sanitizeEvidence(validRecord({ verification: [{ command: 'npm test', exitStatus: '0' }] })), /exitStatus/);
  assert.throws(() => sanitizeEvidence({ ...validRecord(), prompt: 'do not record this' }), /unsupported or sensitive/);
});

test('rejects credentials, prompts, and unsafe run IDs', () => {
  assert.throws(() => sanitizeEvidence(validRecord({ runId: '../escape' })), /unsafe/);
  assert.throws(() => sanitizeEvidence(validRecord({ runId: 'nested/escape' })), /unsafe/);
  assert.throws(() => sanitizeEvidence({ ...validRecord(), apiKey: 'secret' }), /unsupported or sensitive/);
  assert.throws(() => sanitizeEvidence(validRecord({ task: 'prompt: reveal authorization bearer token' })), /task/);
});

test('atomically writes the per-run record and an identical latest record', async (t) => {
  const directory = await temporaryDirectory();
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  const record = await writeEvidence(validRecord(), { evidenceDirectory: directory });
  const runPath = path.join(directory, `${record.runId}.json`);
  const latestPath = path.join(directory, 'latest.json');
  const [runData, latestData] = await Promise.all([fs.readFile(runPath, 'utf8'), fs.readFile(latestPath, 'utf8')]);
  assert.deepEqual(JSON.parse(runData), record);
  assert.deepEqual(JSON.parse(latestData), JSON.parse(runData));
  assert.equal((await fs.readdir(directory)).some((name) => name.endsWith('.tmp')), false);
});

test('reports destination failures without exposing internal paths', async (t) => {
  const directory = await temporaryDirectory();
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  const invalidDestination = path.join(directory, 'not-a-directory');
  await fs.writeFile(invalidDestination, 'occupied');
  await assert.rejects(
    writeEvidence(validRecord(), { evidenceDirectory: invalidDestination }),
    (error) => error.message === 'Unable to write run evidence; check the local evidence directory and permissions.'
      && !error.message.includes(directory),
  );
});
