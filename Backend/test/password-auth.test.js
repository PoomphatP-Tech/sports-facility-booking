const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');

function load(file, mocks) {
  const module = { exports: {} };
  const source = fs.readFileSync(path.join(__dirname, '../src', file), 'utf8');
  vm.runInNewContext('(function(require,module,exports){' + source + '\n})', {
    console: { error() {} },
  })(id => {
    if (!(id in mocks)) throw new Error('Unexpected dependency: ' + id);
    return mocks[id];
  }, module, module.exports);
  return module.exports;
}

function fixture() {
  const identity = { uid: 'member-uid', email: 'member@example.test', email_verified: true };
  const user = { id: '1', firebaseUid: identity.uid, email: 'member@example.test', role: 'member' };
  const calls = [];
  const auth = { verifyIdToken: async token => {
    calls.push('verify');
    if (token !== 'valid-token') throw { code: 'auth/invalid-id-token' };
    return identity;
  } };
  const store = { findByFirebaseUid: async uid => { calls.push(['lookup', uid]); return user; } };
  const middleware = load('middlewares/auth.middleware.js', {
    '../config/firebase': { auth }, '../store/user.store': store,
  });
  async function request(authorization = 'Bearer valid-token', extra = {}) {
    const req = { ...extra, headers: { ...extra.headers, authorization } };
    const res = { statusCode: 200, status(code) { this.statusCode = code; return this; }, json(data) { this.data = data; return this; } };
    let nextCalled = false;
    await middleware.requireAuth(req, res, () => { nextCalled = true; });
    return { req, res, nextCalled };
  }
  return { identity, user, calls, auth, store, request, middleware };
}

test('a verified Firebase account can log in', async () => {
  const f = fixture();
  const result = await f.request();
  assert.equal(result.nextCalled, true);
  assert.equal(result.req.user.id, f.user.id);
  assert.deepEqual(f.calls, ['verify', ['lookup', 'member-uid']]);
  assert.equal(f.identity.email_verified, true);
});

test('missing and invalid tokens still stop before database access', async () => {
  for (const authorization of ['', 'Basic invalid', 'Bearer invalid-token']) {
    const f = fixture();
    const result = await f.request(authorization);
    assert.equal(result.res.statusCode, 401);
    assert.equal(result.nextCalled, false);
    assert.ok(!f.calls.some(Array.isArray));
  }
});

test('a valid token still requires a registered database user', async () => {
  const f = fixture();
  f.store.findByFirebaseUid = async () => null;
  const result = await f.request();
  assert.equal(result.res.statusCode, 401);
  assert.equal(result.nextCalled, false);
});

test('account and role restrictions still apply', async () => {
  const f = fixture();
  f.user.accountStatus = 'suspended';
  assert.equal((await f.request()).res.statusCode, 403);
  f.user.accountStatus = 'active';
  const result = await f.request();
  let allowed = false;
  f.middleware.requireRole(['admin'])(result.req, result.res, () => { allowed = true; });
  assert.equal(result.res.statusCode, 403);
  assert.equal(allowed, false);
});

test('new credentials require email verification', async () => {
  const writes = [];
  const service = load('services/auth.service.js', {
    '../store/user.store': {
      findByEmail: async () => null,
      create: async input => { writes.push(input); return { id: '1', ...input }; },
      createMember: async id => { writes.push(id); },
    },
  });
  const result = await service.registerCredentials({ firebaseUid: 'new-uid', email: 'new@example.test' });
  assert.equal(result.nextStep, 'verifyEmail');
  assert.equal(result.user.role, 'member');
  assert.equal(writes.length, 2);
});

test('ordinary accounts of every role must verify before using any protected route', async () => {
  for (const role of ['member','staff','admin']) {
    for (const route of ['/me','/session','/register/details','/bookings']) {
      const f=fixture();
      f.user.role=role;
      f.identity.email_verified=false;
      const result=await f.request('Bearer valid-token',{path:route});
      assert.equal(result.res.statusCode,403);
      assert.equal(result.res.data.message,'email is not verified');
      assert.equal(result.nextCalled,false);
    }
  }
});

test('only the four seeded demo UIDs can skip verification, with a real token and DB account', async () => {
  for (const [uid,email,role] of [
    ['klBrxNF0BfWgpvWevN9WIB2jyn12','demo.member@example.com','member'],
    ['0habl4qJKvWHNlG5WyHatHRa3KJ3','demo.member2@example.com','member'],
    ['RPhjcBa4NFXhYiBlc9HtxejtoMx1','demo.staff@example.com','staff'],
    ['0IFvF9Exe5ht4BtwQSXulu6NwF02','demo.admin@example.com','admin'],
  ]) {
    const f=fixture();
    Object.assign(f.identity,{uid,email,email_verified:false});
    Object.assign(f.user,{firebaseUid:uid,email,role});
    const result=await f.request();
    assert.equal(result.nextCalled,true);
    assert.equal(result.req.user.role,role);
    assert.equal(f.identity.email_verified,false,'skipping does not rewrite Firebase verification');
    assert.equal((await f.request('Bearer invalid-token')).res.statusCode,401);
    f.user.accountStatus='suspended';
    assert.equal((await f.request()).res.statusCode,403);
    f.store.findByFirebaseUid=async()=>null;
    assert.equal((await f.request()).res.statusCode,401);
  }
});

test('demo email, client flag or client UID cannot bypass verification for another Firebase UID', async () => {
  const f=fixture();
  f.identity.email_verified=false;
  f.identity.email=f.user.email='demo.member@example.com';
  const result=await f.request('Bearer valid-token',{
    body:{isDemo:true,firebaseUid:'klBrxNF0BfWgpvWevN9WIB2jyn12'},
    headers:{'x-demo-account':'true'},
  });
  assert.equal(result.res.statusCode,403);
  assert.equal(result.nextCalled,false);
});
