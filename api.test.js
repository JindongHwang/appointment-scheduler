const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'nolaboda-api-'));
process.env.DB_PATH = path.join(dir, 'db.json');
process.env.PORT = '0';
process.env.SKIP_ENV_FILE = '1';
delete process.env.SUPABASE_URL;
delete process.env.SUPABASE_SERVICE_ROLE_KEY;
delete process.env.SUPABASE_SECRET_KEY;

const { server } = require('./server');

async function test(name, fn) {
  try {
    await fn();
    console.log(`ok - ${name}`);
  } catch (error) {
    console.error(`not ok - ${name}`);
    throw error;
  }
}

function listen() {
  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      resolve(`http://127.0.0.1:${server.address().port}`);
    });
  });
}

async function request(baseUrl, route, options = {}) {
  const response = await fetch(`${baseUrl}${route}`, {
    method: options.method || 'GET',
    headers: { 'Content-Type': 'application/json' },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const data = await response.json();
  assert.equal(response.ok, true, data.error);
  return data;
}

(async () => {
  const baseUrl = await listen();

  try {
    await test('serves a health check for deployment platforms', async () => {
      const response = await fetch(`${baseUrl}/healthz`);
      const data = await response.json();

      assert.equal(response.ok, true, data.error);
      assert.equal(data.ok, true);
    });

    await test('creates and updates a shared room over HTTP', async () => {
      const room = await request(baseUrl, '/api/rooms', {
        method: 'POST',
        body: { title: '공유 테스트' },
      });
      const participant = await request(baseUrl, `/api/rooms/${room.id}/participants`, {
        method: 'POST',
        body: { name: '지혜' },
      });
      const updated = await request(baseUrl, `/api/rooms/${room.id}/participants/${participant.id}/dates`, {
        method: 'PATCH',
        body: { date: '2026-05-02' },
      });
      const saved = await request(baseUrl, `/api/rooms/${room.id}`);

      assert.equal(updated.participants[0].name, '지혜');
      assert.deepEqual(saved.participants[0].availableDates, ['2026-05-02']);
    });
  } finally {
    await new Promise((resolve) => server.close(resolve));
    fs.rmSync(dir, { recursive: true, force: true });
  }
})();
