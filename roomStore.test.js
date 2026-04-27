const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { createRoomStore } = require('./roomStore');

function test(name, fn) {
  try {
    fn();
    console.log(`ok - ${name}`);
  } catch (error) {
    console.error(`not ok - ${name}`);
    throw error;
  }
}

function withTempStore(fn) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'nolaboda-'));
  const dbPath = path.join(dir, 'db.json');
  try {
    return fn(createRoomStore(dbPath));
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

test('creates a room and persists participants across store instances', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'nolaboda-'));
  const dbPath = path.join(dir, 'db.json');

  try {
    const firstStore = createRoomStore(dbPath);
    const room = firstStore.createRoom({ title: '5월 친구 모임' });
    const participant = firstStore.addParticipant(room.id, '지혜');
    firstStore.toggleParticipantDate(room.id, participant.id, '2026-05-02');

    const secondStore = createRoomStore(dbPath);
    const saved = secondStore.getRoom(room.id);

    assert.equal(saved.title, '5월 친구 모임');
    assert.deepEqual(saved.participants[0].availableDates, ['2026-05-02']);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('toggles dates and confirms a recommended date', () => {
  withTempStore((store) => {
    const room = store.createRoom({ title: '스터디 일정' });
    const jh = store.addParticipant(room.id, '지혜');
    const ms = store.addParticipant(room.id, '민수');

    store.toggleParticipantDate(room.id, jh.id, '2026-05-02');
    store.toggleParticipantDate(room.id, ms.id, '2026-05-02');
    store.toggleParticipantDate(room.id, ms.id, '2026-05-03');
    store.toggleParticipantDate(room.id, ms.id, '2026-05-03');
    const confirmed = store.updateRoom(room.id, { confirmedDate: '2026-05-02' });

    assert.equal(confirmed.confirmedDate, '2026-05-02');
    assert.deepEqual(confirmed.participants[1].availableDates, ['2026-05-02']);
  });
});
