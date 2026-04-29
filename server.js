const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { loadEnvFile } = require('./envLoader');
const { createConfiguredRoomStore } = require('./storeFactory');

const rootDir = __dirname;
if (process.env.SKIP_ENV_FILE !== '1') {
  loadEnvFile(path.join(rootDir, '.env'));
}

const publicFiles = new Set(['/index.html', '/styles.css', '/scheduler.js', '/roomSession.js', '/app.js']);
const port = Number(process.env.PORT || 3000);
const host = process.env.HOST || '0.0.0.0';
const dbPath = process.env.DB_PATH || path.join(rootDir, 'rooms.db.json');
const store = createConfiguredRoomStore({ dbPath });

const server = http.createServer(async (request, response) => {
  try {
    const url = new URL(request.url, `http://${request.headers.host}`);

    if (request.method === 'GET' && url.pathname === '/healthz') {
      sendJson(response, 200, { ok: true, store: store.kind });
      return;
    }

    if (url.pathname.startsWith('/api/')) {
      await handleApi(request, response, url);
      return;
    }

    serveStatic(response, url.pathname === '/' ? '/index.html' : url.pathname);
  } catch (error) {
    sendJson(response, error.statusCode || 500, {
      error: error.message || 'Internal server error',
    });
  }
});

async function handleApi(request, response, url) {
  const segments = url.pathname.split('/').filter(Boolean).map(decodeURIComponent);

  if (request.method === 'POST' && url.pathname === '/api/rooms') {
    const body = await readJsonBody(request);
    sendJson(response, 201, await store.createRoom(body));
    return;
  }

  if (segments[0] === 'api' && segments[1] === 'rooms' && segments[2]) {
    const roomId = segments[2];

    if (request.method === 'GET' && segments.length === 3) {
      sendJson(response, 200, await store.getRoom(roomId));
      return;
    }

    if (request.method === 'PATCH' && segments.length === 3) {
      const body = await readJsonBody(request);
      sendJson(response, 200, await store.updateRoom(roomId, body));
      return;
    }

    if (request.method === 'POST' && segments[3] === 'participants' && segments.length === 4) {
      const body = await readJsonBody(request);
      sendJson(response, 201, await store.addParticipant(roomId, body.name));
      return;
    }

    if (
      request.method === 'PATCH' &&
      segments[3] === 'participants' &&
      segments[4] &&
      segments[5] === 'dates'
    ) {
      const body = await readJsonBody(request);
      sendJson(response, 200, await store.toggleParticipantDate(roomId, segments[4], body.date));
      return;
    }
  }

  sendJson(response, 404, { error: 'Not found' });
}

function serveStatic(response, pathname) {
  if (!publicFiles.has(pathname)) {
    sendJson(response, 404, { error: 'Not found' });
    return;
  }

  const filePath = path.join(rootDir, pathname);
  const extension = path.extname(filePath);
  const contentType = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
  }[extension] || 'text/plain; charset=utf-8';

  response.writeHead(200, { 'Content-Type': contentType });
  fs.createReadStream(filePath).pipe(response);
}

function readJsonBody(request) {
  return new Promise((resolve, reject) => {
    let raw = '';
    request.on('data', (chunk) => {
      raw += chunk;
      if (raw.length > 1_000_000) {
        request.destroy();
        reject(new Error('Request body too large'));
      }
    });
    request.on('end', () => {
      if (!raw.trim()) {
        resolve({});
        return;
      }

      try {
        resolve(JSON.parse(raw));
      } catch (error) {
        error.statusCode = 400;
        reject(error);
      }
    });
    request.on('error', reject);
  });
}

function sendJson(response, statusCode, data) {
  response.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8' });
  response.end(JSON.stringify(data));
}

if (require.main === module) {
  server.listen(port, host, () => {
    console.log(`Nolaboda is running at http://${host}:${port}`);
  });
}

module.exports = {
  server,
};
