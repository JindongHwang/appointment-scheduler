const assert = require('node:assert/strict');
const {
  createRoomApi,
  createConfiguredRoomApi,
  normalizeSupabaseUrl,
  buildHeaders,
  isSecretKey,
} = require('./roomApi');

const tests = [];
function test(name, fn) {
  tests.push({ name, fn });
}

function fakeFetch(reply) {
  const calls = [];
  const fetchImpl = async (url, init) => {
    calls.push({ url, init, body: JSON.parse(init.body) });
    const { status = 200, body = null } = typeof reply === 'function' ? reply(url, init) : reply;
    return {
      ok: status >= 200 && status < 300,
      status,
      text: async () => (body === undefined ? '' : JSON.stringify(body)),
    };
  };
  return { calls, fetchImpl };
}

function jwt(role) {
  const part = (value) => Buffer.from(JSON.stringify(value)).toString('base64url');
  return `${part({ alg: 'HS256' })}.${part({ role })}.signature`;
}

test('normalizes project URLs and REST URLs to the project base URL', () => {
  assert.equal(normalizeSupabaseUrl('https://example.supabase.co/rest/v1/'), 'https://example.supabase.co');
  assert.equal(normalizeSupabaseUrl(' https://example.supabase.co/ '), 'https://example.supabase.co');
});

test('returns no api when config.js is empty so the page can use the local demo', () => {
  assert.equal(createConfiguredRoomApi(undefined), null);
  assert.equal(createConfiguredRoomApi({ supabaseUrl: '', supabaseKey: '' }), null);
  assert.equal(createConfiguredRoomApi({ supabaseUrl: 'https://example.supabase.co', supabaseKey: ' ' }), null);
});

test('sends publishable keys only in the apikey header', () => {
  assert.deepEqual(buildHeaders('sb_publishable_abc'), {
    'Content-Type': 'application/json',
    apikey: 'sb_publishable_abc',
  });
});

test('also sends legacy anon keys as a bearer token', () => {
  const key = jwt('anon');
  assert.equal(buildHeaders(key).Authorization, `Bearer ${key}`);
});

test('refuses secret keys', () => {
  assert.equal(isSecretKey('sb_secret_abc'), true);
  assert.equal(isSecretKey(jwt('service_role')), true);
  assert.equal(isSecretKey(jwt('anon')), false);
  assert.equal(isSecretKey('sb_publishable_abc'), false);
  assert.throws(() => createRoomApi({ supabaseUrl: 'https://example.supabase.co', supabaseKey: 'sb_secret_abc' }));
});

test('calls the Supabase functions with the expected arguments', async () => {
  const { calls, fetchImpl } = fakeFetch({ body: { id: 'room_1', participants: [] } });
  const api = createRoomApi({
    supabaseUrl: 'https://example.supabase.co/',
    supabaseKey: 'sb_publishable_abc',
    fetch: fetchImpl,
  });

  await api.createRoom({ title: '11월 친구 모임' });
  await api.getRoom('room_1');
  await api.updateRoom('room_1', { title: '새 이름' });
  await api.updateRoom('room_1', { confirmedDate: '2026-11-21' });
  await api.addParticipant('room_1', '지혜');
  await api.toggleParticipantDate('room_1', 'p_1', '2026-11-21');

  assert.deepEqual(
    calls.map((call) => [call.url.replace('https://example.supabase.co/rest/v1/rpc/', ''), call.body]),
    [
      ['create_room', { p_title: '11월 친구 모임' }],
      ['get_room', { p_room_id: 'room_1' }],
      ['update_room', { p_room_id: 'room_1', p_title: '새 이름' }],
      ['update_room', { p_room_id: 'room_1', p_confirmed_date: '2026-11-21' }],
      ['add_participant', { p_room_id: 'room_1', p_name: '지혜' }],
      ['toggle_participant_date', { p_room_id: 'room_1', p_participant_id: 'p_1', p_date: '2026-11-21' }],
    ]
  );
  assert.equal(calls[0].init.method, 'POST');
  assert.equal(calls[0].init.headers.apikey, 'sb_publishable_abc');
  assert.equal(calls[0].init.headers.Authorization, undefined);
});

test('treats a missing room as an error', async () => {
  const { fetchImpl } = fakeFetch({ body: null });
  const api = createRoomApi({ supabaseUrl: 'https://example.supabase.co', supabaseKey: 'sb_publishable_abc', fetch: fetchImpl });
  await assert.rejects(() => api.getRoom('room_missing'), /약속을 찾을 수 없어요/);
});

test('surfaces the message from a failed request', async () => {
  const { fetchImpl } = fakeFetch({ status: 400, body: { code: 'P0001', message: '참여자를 찾을 수 없어요.' } });
  const api = createRoomApi({ supabaseUrl: 'https://example.supabase.co', supabaseKey: 'sb_publishable_abc', fetch: fetchImpl });
  await assert.rejects(() => api.toggleParticipantDate('room_1', 'p_x', '2026-11-21'), /참여자를 찾을 수 없어요/);
});

test('reports a connection problem when the request cannot be sent', async () => {
  const api = createRoomApi({
    supabaseUrl: 'https://example.supabase.co',
    supabaseKey: 'sb_publishable_abc',
    fetch: async () => {
      throw new TypeError('Failed to fetch');
    },
  });
  await assert.rejects(() => api.getRoom('room_1'), /연결하지 못했어요/);
});

(async () => {
  for (const { name, fn } of tests) {
    try {
      await fn();
      console.log(`ok - ${name}`);
    } catch (error) {
      console.error(`not ok - ${name}`);
      throw error;
    }
  }
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
