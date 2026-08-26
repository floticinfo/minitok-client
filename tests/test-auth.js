'use strict';
const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const fs2 = require('fs');
const path = require('path');
const os = require('os');

describe('TokenStore', () => {
  let tmpDir, store;
  beforeEach(() => { tmpDir = fs2.mkdtempSync(path.join(os.tmpdir(), 'mtok-ts-')); store = new (require('../src/auth/token-store').TokenStore)(tmpDir); });
  afterEach(() => { fs2.rmSync(tmpDir, { recursive: true, force: true }); });
  it('returns null for unknown', () => { assert.equal(store.load('nope'), null); });
  it('save/load round-trip', () => { store.save('t', { access_token: 'tok' }); assert.equal(store.load('t').access_token, 'tok'); });
  it('isValid future', () => { store.save('v', { access_token: 'k', expires_at: new Date(Date.now()+9999999).toISOString() }); assert.equal(store.isValid('v'), true); });
  it('isValid expired', () => { store.save('e', { access_token: 'k', expires_at: new Date(Date.now()-9999999).toISOString() }); assert.equal(store.isValid('e'), false); });
  it('remove deletes', () => { store.save('d', { access_token: 'k' }); store.remove('d'); assert.equal(store.load('d'), null); });
  it('list all', () => { store.save('a', { access_token: 'a' }); store.save('b', { access_token: 'b' }); assert.equal(store.list().length, 2); });
  it('remove silent', () => { store.remove('nope'); });
  it('isValid no expiry', () => { store.save('n', { access_token: 'k' }); assert.equal(store.isValid('n'), true); });
});

describe('AuthManager', () => {
  let tmpDir, mgr;
  beforeEach(() => {
    tmpDir = fs2.mkdtempSync(path.join(os.tmpdir(), 'mtok-am-'));
    const { AuthManager } = require('../src/auth/index');
    mgr = new AuthManager();
    mgr._tokenStore = new (require('../src/auth/token-store').TokenStore)(tmpDir);
  });
  afterEach(() => { fs2.rmSync(tmpDir, { recursive: true, force: true }); });
  it('legacy api_key', async () => { const r = await mgr.resolve('anthropic', { api_key: 'sk-test' }); assert.equal(r.headers['x-api-key'], 'sk-test'); });
  it('env var fallback', async () => { process.env.ANTHROPIC_API_KEY = 'sk-env'; const r = await mgr.resolve('anthropic', {}); assert.equal(r.headers['x-api-key'], 'sk-env'); delete process.env.ANTHROPIC_API_KEY; });
  it('auth.type api_key', async () => { const r = await mgr.resolve('x', { auth: { type: 'api_key', key: 'k' } }); assert.equal(r.headers['x-api-key'], 'k'); });
  it('auth.type none', async () => { const r = await mgr.resolve('ollama', { auth: { type: 'none' } }); assert.deepEqual(r.headers, {}); });
  it('throws unknown type', async () => { await assert.rejects(() => mgr.resolve('x', { auth: { type: 'weird' } })); });
  it('isAvailable true', async () => { assert.equal(await mgr.isAvailable('a', { api_key: 'k' }), true); });
  it('isAvailable false', async () => { assert.equal(await mgr.isAvailable('a', {}), false); });
  it('alias', async () => { assert.equal(await mgr.isAvailable('claude', { api_key: 'k' }), true); });
  it('env var ref', async () => { process.env.MY_KEY = 'sk-fe'; const r = await mgr.resolve('x', { auth: { type: 'api_key', key: '${MY_KEY}' } }); assert.equal(r.headers['x-api-key'], 'sk-fe'); delete process.env.MY_KEY; });
});

describe('IAMResolver', () => {
  it('throws without creds', async () => { const { IAMResolver } = require('../src/auth/iam'); await assert.rejects(() => new IAMResolver().resolve({})); });
  it('uses explicit creds', async () => { const { IAMResolver } = require('../src/auth/iam'); const r = await new IAMResolver().resolve({ access_key_id: 'AKIATEST', secret_access_key: 'SECRET' }); assert.ok(r.headers['x-amz-date']); });
  it('session token', async () => { const { IAMResolver } = require('../src/auth/iam'); const r = await new IAMResolver().resolve({ access_key_id: 'A', secret_access_key: 'S', session_token: 'FwoG' }); assert.equal(r.headers['x-amz-security-token'], 'FwoG'); });
});

describe('ServiceAccountResolver', () => {
  it('throws without creds', async () => { const { ServiceAccountResolver } = require('../src/auth/service-account'); await assert.rejects(() => new ServiceAccountResolver().resolve({})); });
  it('throws unknown type', async () => {
    const { ServiceAccountResolver } = require('../src/auth/service-account');
    const tmp = fs2.mkdtempSync(path.join(os.tmpdir(), 'mtok-sa-'));
    const fp = path.join(tmp, 'key.json');
    fs2.writeFileSync(fp, JSON.stringify({ type: 'bad' }));
    await assert.rejects(() => new ServiceAccountResolver().resolve({ key_file: fp }), /Unsupported/);
    fs2.rmSync(tmp, { recursive: true, force: true });
  });
});

describe('Auth CLI', () => {
  it('registers', () => { const { Command } = require('commander'); const p = new Command(); require('../src/cli/commands/auth').register(p); const a = p.commands.find(c => c.name() === 'auth'); assert.ok(a.commands.map(c => c.name()).includes('login')); assert.ok(a.commands.map(c => c.name()).includes('status')); assert.ok(a.commands.map(c => c.name()).includes('logout')); });
});

describe('Provider auth', () => {
  it('has _resolveAuth', () => { const { createProvider } = require('../src/llm/provider'); assert.equal(typeof createProvider('anthropic')._resolveAuth, 'function'); });
  it('anthropic avail', async () => { const { createProvider } = require('../src/llm/provider'); assert.equal(await createProvider('anthropic', { api_key: 'k' }).isAvailable(), true); });
  it('openai avail', async () => { const { createProvider } = require('../src/llm/provider'); assert.equal(await createProvider('openai', { api_key: 'k' }).isAvailable(), true); });
  it('google avail', async () => { const { createProvider } = require('../src/llm/provider'); assert.equal(await createProvider('google', { api_key: 'k' }).isAvailable(), true); });
});
