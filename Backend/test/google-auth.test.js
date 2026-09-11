const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');
const express = require('express');

function load(file, mocks) {
  const source = fs.readFileSync(path.join(__dirname, '../src', file), 'utf8');
  const module = { exports: {} };
  vm.runInNewContext('(function(require, module, exports) {' + source + '\n})', {
    console: { log() {}, error() {} },
  })((id) => {
    if (id === 'express') return express;
    if (!(id in mocks)) throw new Error('Unexpected dependency: ' + id);
    return mocks[id];
  }, module, module.exports);
  return module.exports;
}

async function endpointFixture(t) {
  const identity = {
    uid: 'verified-uid', email: 'google@example.test', email_verified: true,
    name: 'Google Member', firebase: { sign_in_provider: 'google.com' },
  };
  const users = new Map();
  const writes = [];
  const auth = { verifyIdToken: async (token) => {
    if (token !== 'valid-token') throw { code: 'auth/invalid-id-token' };
    return identity;
  } };
  const store = {
    findByFirebaseUid: async (uid) => users.get(uid),
    findOrCreateGoogleUser: async (input) => {
      writes.push(input);
      if (!users.has(input.firebaseUid)) users.set(input.firebaseUid, {
        id: '1', ...input, role: 'member', accountStatus: 'active', dateOfBirth: null, address: null,
      });
      return users.get(input.firebaseUid);
    },
  };
  const service = load('services/auth.service.js', { '../store/user.store': store });
  const controller = load('controllers/auth.controller.js', { '../services/auth.service': service });
  const googleAuth = load('middlewares/google-auth.middleware.js', { '../config/firebase': { auth } });
  const authMiddleware = load('middlewares/auth.middleware.js', {
    '../config/firebase': { auth }, '../store/user.store': store,
  });
  const router = load('routes/auth.routes.js', {
    '../controllers/auth.controller': controller, '../middlewares/auth.middleware': authMiddleware,
    '../middlewares/google-auth.middleware': googleAuth,
  });
  const app = express();
  app.use(express.json());
  app.use('/api/auth', router);
  const server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  t.after(() => new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve())));
  const request = async (body = {}, token = 'valid-token') => {
    const response = await fetch(`http://127.0.0.1:${server.address().port}/api/auth/google-sync`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify(body),
    });
    return { status: response.status, data: await response.json() };
  };
  return { identity, users, writes, auth, store, request };
}

test('Google token is verified before database sync; body identity and role are ignored', async (t) => {
  const f = await endpointFixture(t);
  const result = await f.request({ firebaseUid: 'victim-uid', email: 'admin@example.test', role: 'admin', firstName: 'Spoofed' });
  assert.equal(result.status, 200);
  assert.equal(result.data.user.firebaseUid, f.identity.uid);
  assert.equal(result.data.user.email, f.identity.email);
  assert.equal(result.data.user.firstName, 'Google');
  assert.equal(result.data.user.lastName, 'Member');
  assert.equal(result.data.user.role, 'member');
  assert.equal(result.data.nextStep, 'details');
});

test('missing, invalid, non-Google and unverified tokens cannot create a user', async (t) => {
  const f = await endpointFixture(t);
  assert.equal((await f.request({}, '')).status, 401);
  assert.equal((await f.request({}, 'invalid')).status, 401);
  f.identity.firebase.sign_in_provider = 'password';
  assert.equal((await f.request()).status, 403);
  f.identity.firebase.sign_in_provider = 'google.com';
  f.identity.email_verified = false;
  assert.equal((await f.request()).status, 403);
  assert.equal(f.writes.length, 0);
});

test('returning members keep their profile and go directly to the app', async (t) => {
  const f = await endpointFixture(t);
  await f.request();
  Object.assign(f.users.get(f.identity.uid), { firstName: 'Edited name', lastName: 'Member', dateOfBirth: '2000-01-01', address: 'Existing address' });
  const result = await f.request();
  assert.equal(result.status, 200);
  assert.equal(result.data.user.firstName, 'Edited name');
  assert.equal(result.data.nextStep, null);
  assert.equal(f.users.size, 1);
});

test('staff and admin roles do not require member profile fields', async (t) => {
  const f = await endpointFixture(t);
  await f.request();
  for (const role of ['staff', 'admin']) {
    f.users.get(f.identity.uid).role = role;
    const result = await f.request();
    assert.equal(result.status, 200);
    assert.equal(result.data.user.role, role);
    assert.equal(result.data.nextStep, null);
  }
});

test('existing API access checks still run after Google account sync', async (t) => {
  const f = await endpointFixture(t);
  await f.request();
  f.users.get(f.identity.uid).accountStatus = 'suspended';
  const result = await f.request();
  assert.equal(result.status, 403);
  assert.equal(result.data.user, undefined);
  assert.equal(result.data.state, undefined);
});

test('verification outages and database errors are retryable without a false logged-in response', async (t) => {
  const f = await endpointFixture(t);
  const verify = f.auth.verifyIdToken;
  f.auth.verifyIdToken = async () => { throw { code: 'auth/internal-error' }; };
  assert.equal((await f.request()).status, 503);
  assert.equal(f.writes.length, 0);
  f.auth.verifyIdToken = verify;
  f.store.findOrCreateGoogleUser = async () => { throw { code: 'ECONNREFUSED' }; };
  const result = await f.request();
  assert.equal(result.status, 503);
  assert.equal(result.data.user, undefined);
});

test('an email collision produces a useful conflict response instead of another user session', async (t) => {
  const f = await endpointFixture(t);
  f.store.findOrCreateGoogleUser = async () => {
    throw { statusCode: 409, message: 'Please sign in using your original method.' };
  };
  const result = await f.request();
  assert.equal(result.status, 409);
  assert.equal(result.data.user, undefined);
});

function storeFixture({ existing = null, collision = false, memberFailure = false, concurrentInsert = false } = {}) {
  const calls = [];
  let inserted = null;
  const row = { id: 1, firebase_uid: 'verified-uid', email: 'google@example.test', first_name: 'Google', last_name: 'Member', role: 'member', account_status: 'active' };
  const client = {
    query: async (sql, params) => {
      calls.push({ sql, params });
      if (sql.startsWith('SELECT')) return { rows: existing ? [existing] : inserted ? [inserted] : [] };
      if (sql.startsWith('INSERT INTO public.users')) {
        if (collision) return { rows: [] };
        inserted = row;
        return { rows: concurrentInsert ? [] : [row] };
      }
      if (sql.startsWith('INSERT INTO public.members') && memberFailure) throw new Error('Member insert failed');
      return { rows: [] };
    },
    release: () => { calls.push({ sql: 'RELEASE' }); },
  };
  const store = load('store/user.store.js', { '../config/db': { pool: { connect: async () => client } } });
  const sync = () => store.findOrCreateGoogleUser({ firebaseUid: row.firebase_uid, email: row.email, firstName: row.first_name, lastName: row.last_name });
  return { calls, sync, row };
}

test('user and member creation commit together, and member failure rolls back the user', async () => {
  const success = storeFixture();
  assert.equal((await success.sync()).firebaseUid, success.row.firebase_uid);
  assert.equal(success.calls[0].sql, 'BEGIN');
  assert.equal(success.calls.at(-2).sql, 'COMMIT');
  assert.equal(success.calls.at(-1).sql, 'RELEASE');
  const failure = storeFixture({ memberFailure: true });
  await assert.rejects(failure.sync(), /Member insert failed/);
  assert.equal(failure.calls.at(-2).sql, 'ROLLBACK');
  assert.ok(!failure.calls.some(({ sql }) => sql === 'COMMIT'));
});

test('email belonging to a different UID is never reassigned or merged', async () => {
  const f = storeFixture({ collision: true });
  await assert.rejects(f.sync(), (error) => error.statusCode === 409);
  assert.ok(!f.calls.some(({ sql }) => sql.startsWith('UPDATE') || sql.startsWith('DELETE')));
  assert.equal(f.calls.at(-2).sql, 'ROLLBACK');
});

test('concurrent creation of the same UID reuses the account and repairs missing membership', async () => {
  const f = storeFixture({ concurrentInsert: true });
  const user = await f.sync();
  assert.equal(user.firebaseUid, f.row.firebase_uid);
  assert.equal(f.calls.filter(({ sql }) => sql.startsWith('INSERT INTO public.users')).length, 1);
  assert.ok(f.calls.some(({ sql }) => sql.startsWith('INSERT INTO public.members')));
  assert.ok(f.calls.some(({ sql }) => sql === 'COMMIT'));
});
