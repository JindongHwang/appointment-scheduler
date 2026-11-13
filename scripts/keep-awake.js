// Sends a few harmless requests to Supabase so the free project keeps seeing activity.
// Reads the project address and publishable key from config.js, so there is nothing else to set up.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const sandbox = { window: {} };
vm.runInNewContext(fs.readFileSync(path.join(__dirname, '..', 'config.js'), 'utf8'), sandbox);
const config = sandbox.window.NOLABODA_CONFIG || {};
const baseUrl = String(config.supabaseUrl || '').trim().replace(/\/+$/, '');
const key = String(config.supabaseKey || '').trim();

async function main() {
  if (!baseUrl || !key) {
    console.log('config.js is empty, nothing to keep awake.');
    return;
  }

  const headers = { 'Content-Type': 'application/json', apikey: key };
  if (key.startsWith('eyJ')) headers.Authorization = `Bearer ${key}`;

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    const response = await fetch(`${baseUrl}/rest/v1/rpc/get_room`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ p_room_id: 'keep-awake' }),
    });
    const body = await response.text();
    console.log(`request ${attempt}: HTTP ${response.status}`);
    if (!response.ok) {
      // A failed run shows up in the Actions tab and GitHub emails the owner,
      // which is the signal that the project is paused or the setup changed.
      throw new Error(`Supabase answered ${response.status}: ${body.slice(0, 200)}`);
    }
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
