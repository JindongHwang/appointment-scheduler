function createParticipant(name, availableDates = []) {
  return {
    id: makeId(name),
    name: name.trim(),
    availableDates: uniqueSortedDates(availableDates),
  };
}

function toggleDate(participant, date) {
  const dates = new Set(participant.availableDates);
  if (dates.has(date)) {
    dates.delete(date);
  } else {
    dates.add(date);
  }

  return {
    ...participant,
    availableDates: uniqueSortedDates([...dates]),
  };
}

function summarizeAvailability(participants) {
  const dates = {};

  participants.forEach((participant) => {
    participant.availableDates.forEach((date) => {
      if (!dates[date]) {
        dates[date] = { count: 0, names: [] };
      }
      dates[date].count += 1;
      dates[date].names.push(participant.name);
    });
  });

  const maxCount = Object.values(dates).reduce(
    (max, item) => Math.max(max, item.count),
    0
  );

  const bestDates = Object.keys(dates)
    .filter((date) => dates[date].count === maxCount)
    .sort();

  return {
    dates,
    bestDates,
    totalParticipants: participants.length,
  };
}

function uniqueSortedDates(dates) {
  return [...new Set(dates)].sort();
}

function makeId(seed) {
  return `${seed.trim().toLowerCase()}-${Math.random().toString(36).slice(2, 8)}`;
}

if (typeof module !== 'undefined') {
  module.exports = {
    summarizeAvailability,
    createParticipant,
    toggleDate,
  };
}
