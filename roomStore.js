const fs = require('node:fs');
const path = require('node:path');
const { createParticipant, toggleDate } = require('./scheduler');

const colors = ['#4f9d76', '#ef7d6b', '#5f8fc7', '#e4b94f', '#9b72cf'];

function createRoomStore(dbPath) {
  ensureDb(dbPath);

  function createRoom(input = {}) {
    const data = readDb(dbPath);
    const room = {
      id: createId('room'),
      title: normalizeText(input.title) || 'New event',
      confirmedDate: '',
      createdAt: new Date().toISOString(),
      participants: [],
    };

    data.rooms[room.id] = room;
    writeDb(dbPath, data);
    return clone(room);
  }

  function getRoom(roomId) {
    const room = readDb(dbPath).rooms[roomId];
    if (!room) {
      throw notFound('Room not found');
    }
    return clone(room);
  }

  function updateRoom(roomId, updates = {}) {
    const data = readDb(dbPath);
    const room = data.rooms[roomId];
    if (!room) {
      throw notFound('Room not found');
    }

    if (Object.prototype.hasOwnProperty.call(updates, 'title')) {
      room.title = normalizeText(updates.title) || room.title;
    }
    if (Object.prototype.hasOwnProperty.call(updates, 'confirmedDate')) {
      room.confirmedDate = normalizeText(updates.confirmedDate);
    }

    writeDb(dbPath, data);
    return clone(room);
  }

  function addParticipant(roomId, name) {
    const data = readDb(dbPath);
    const room = data.rooms[roomId];
    if (!room) {
      throw notFound('Room not found');
    }

    const participant = {
      ...createParticipant(normalizeText(name) || `Friend ${room.participants.length + 1}`),
      color: colors[room.participants.length % colors.length],
    };
    room.participants.push(participant);
    writeDb(dbPath, data);
    return clone(participant);
  }

  function toggleParticipantDate(roomId, participantId, date) {
    const data = readDb(dbPath);
    const room = data.rooms[roomId];
    if (!room) {
      throw notFound('Room not found');
    }

    const index = room.participants.findIndex((item) => item.id === participantId);
    if (index === -1) {
      throw notFound('Participant not found');
    }

    room.participants[index] = {
      ...toggleDate(room.participants[index], normalizeText(date)),
      color: room.participants[index].color,
    };
    writeDb(dbPath, data);
    return clone(room);
  }

  return {
    kind: 'local',
    createRoom,
    getRoom,
    updateRoom,
    addParticipant,
    toggleParticipantDate,
  };
}

function ensureDb(dbPath) {
  const dir = path.dirname(dbPath);
  fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(dbPath)) {
    writeDb(dbPath, { rooms: {} });
  }
}

function readDb(dbPath) {
  const raw = fs.readFileSync(dbPath, 'utf8');
  return raw.trim() ? JSON.parse(raw) : { rooms: {} };
}

function writeDb(dbPath, data) {
  fs.writeFileSync(dbPath, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
}

function normalizeText(value) {
  return String(value || '').trim();
}

function createId(prefix) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function notFound(message) {
  const error = new Error(message);
  error.statusCode = 404;
  return error;
}

module.exports = {
  createRoomStore,
};
