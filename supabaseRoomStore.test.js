const assert = require('node:assert/strict');
const { normalizeSupabaseBaseUrl } = require('./supabaseRoomStore');

function test(name, fn) {
  try {
    fn();
    console.log(`ok - ${name}`);
  } catch (error) {
    console.error(`not ok - ${name}`);
    throw error;
  }
}

test('normalizes project URLs and REST URLs to the project base URL', () => {
  assert.equal(
    normalizeSupabaseBaseUrl('https://example.supabase.co/rest/v1/'),
    'https://example.supabase.co'
  );
  assert.equal(
    normalizeSupabaseBaseUrl('https://example.supabase.co'),
    'https://example.supabase.co'
  );
});
