const assert = require('node:assert/strict');
const { resolveInitialRoomId, buildRoomUrl } = require('./roomSession');

function test(name, fn) {
  try {
    fn();
    console.log(`ok - ${name}`);
  } catch (error) {
    console.error(`not ok - ${name}`);
    throw error;
  }
}

test('prefers the room id from the URL over the saved room id', () => {
  assert.equal(resolveInitialRoomId('?room=current', 'saved'), 'current');
});

test('falls back to the saved room id when the URL has no room id', () => {
  assert.equal(resolveInitialRoomId('', 'saved'), 'saved');
});

test('builds a stable room URL without changing other query params', () => {
  assert.equal(
    buildRoomUrl('https://example.com/?view=calendar', 'room_123'),
    'https://example.com/?view=calendar&room=room_123'
  );
});
