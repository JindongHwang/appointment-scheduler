const assert = require('node:assert/strict');
const path = require('node:path');
const os = require('node:os');
const { createConfiguredRoomStore } = require('./storeFactory');

function test(name, fn) {
  try {
    fn();
    console.log(`ok - ${name}`);
  } catch (error) {
    console.error(`not ok - ${name}`);
    throw error;
  }
}

test('uses the local store when Supabase environment variables are missing', () => {
  const store = createConfiguredRoomStore({
    env: {},
    dbPath: path.join(os.tmpdir(), `nolaboda-${Date.now()}.json`),
  });

  assert.equal(store.kind, 'local');
});

test('uses the Supabase store when all Supabase environment variables exist', () => {
  const store = createConfiguredRoomStore({
    env: {
      SUPABASE_URL: 'https://example.supabase.co',
      SUPABASE_SERVICE_ROLE_KEY: 'service-role-key',
    },
    dbPath: path.join(os.tmpdir(), `nolaboda-${Date.now()}.json`),
  });

  assert.equal(store.kind, 'supabase');
});

test('accepts the newer Supabase secret key environment variable name', () => {
  const store = createConfiguredRoomStore({
    env: {
      SUPABASE_URL: 'https://example.supabase.co',
      SUPABASE_SECRET_KEY: 'secret-key',
    },
    dbPath: path.join(os.tmpdir(), `nolaboda-${Date.now()}.json`),
  });

  assert.equal(store.kind, 'supabase');
});
