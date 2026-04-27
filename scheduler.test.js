const assert = require('node:assert/strict');
const {
  summarizeAvailability,
  createParticipant,
  toggleDate,
} = require('./scheduler');

function test(name, fn) {
  try {
    fn();
    console.log(`ok - ${name}`);
  } catch (error) {
    console.error(`not ok - ${name}`);
    throw error;
  }
}

test('summarizes availability and recommends dates with the most people', () => {
  const participants = [
    createParticipant('지혜', ['2026-05-02', '2026-05-09']),
    createParticipant('민수', ['2026-05-02']),
    createParticipant('수빈', ['2026-05-09']),
  ];

  const summary = summarizeAvailability(participants);

  assert.deepEqual(summary.bestDates, ['2026-05-02', '2026-05-09']);
  assert.equal(summary.dates['2026-05-02'].count, 2);
  assert.deepEqual(summary.dates['2026-05-02'].names, ['지혜', '민수']);
  assert.equal(summary.totalParticipants, 3);
});

test('toggleDate adds and removes dates without duplicates', () => {
  const participant = createParticipant('지혜', ['2026-05-02']);

  const added = toggleDate(participant, '2026-05-09');
  const removed = toggleDate(added, '2026-05-02');
  const addedAgain = toggleDate(removed, '2026-05-09');

  assert.deepEqual(added.availableDates, ['2026-05-02', '2026-05-09']);
  assert.deepEqual(removed.availableDates, ['2026-05-09']);
  assert.deepEqual(addedAgain.availableDates, []);
});
