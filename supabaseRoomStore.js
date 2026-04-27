const { createParticipant, toggleDate } = require('./scheduler');

const colors = ['#4f9d76', '#ef7d6b', '#5f8fc7', '#e4b94f', '#9b72cf'];

function createSupabaseRoomStore(options) {
  const baseUrl = normalizeSupabaseBaseUrl(options.supabaseUrl);
  const serviceRoleKey = options.serviceRoleKey;

  if (!baseUrl || !serviceRoleKey) {
    throw new Error('Supabase URL and service role key are required');
  }

  async function createRoom(input = {}) {
    const room = {
      id: createId('room'),
      title: normalizeText(input.title) || 'New event',
      confirmed_date: '',
    };

    const rows = await request('/rooms', {
      method: 'POST',
      body: room,
      prefer: 'return=representation',
    });

    return toRoom(rows[0], []);
  }

  async function getRoom(roomId) {
    const rows = await request(
      `/rooms?id=eq.${encodeURIComponent(roomId)}&select=id,title,confirmed_date,created_at,participants(id,name,color,available_dates,created_at)&limit=1`
    );

    if (!rows.length) {
      throw notFound('Room not found');
    }

    return toRoom(rows[0], rows[0].participants || []);
  }

  async function updateRoom(roomId, updates = {}) {
    const body = {};

    if (Object.prototype.hasOwnProperty.call(updates, 'title')) {
      body.title = normalizeText(updates.title);
    }
    if (Object.prototype.hasOwnProperty.call(updates, 'confirmedDate')) {
      body.confirmed_date = normalizeText(updates.confirmedDate);
    }

    const rows = await request(`/rooms?id=eq.${encodeURIComponent(roomId)}`, {
      method: 'PATCH',
      body,
      prefer: 'return=representation',
    });

    if (!rows.length) {
      throw notFound('Room not found');
    }

    return getRoom(roomId);
  }

  async function addParticipant(roomId, name) {
    const room = await getRoom(roomId);
    const participant = {
      ...createParticipant(normalizeText(name) || `Friend ${room.participants.length + 1}`),
      room_id: roomId,
      color: colors[room.participants.length % colors.length],
      available_dates: [],
    };

    const rows = await request('/participants', {
      method: 'POST',
      body: toParticipantRow(participant),
      prefer: 'return=representation',
    });

    return toParticipant(rows[0]);
  }

  async function toggleParticipantDate(roomId, participantId, date) {
    const room = await getRoom(roomId);
    const participant = room.participants.find((item) => item.id === participantId);

    if (!participant) {
      throw notFound('Participant not found');
    }

    const updated = toggleDate(participant, normalizeText(date));
    const rows = await request(
      `/participants?id=eq.${encodeURIComponent(participantId)}&room_id=eq.${encodeURIComponent(roomId)}`,
      {
        method: 'PATCH',
        body: { available_dates: updated.availableDates },
        prefer: 'return=representation',
      }
    );

    if (!rows.length) {
      throw notFound('Participant not found');
    }

    return getRoom(roomId);
  }

  async function request(route, options = {}) {
    const response = await fetch(`${baseUrl}/rest/v1${route}`, {
      method: options.method || 'GET',
      headers: {
        apikey: serviceRoleKey,
        authorization: `Bearer ${serviceRoleKey}`,
        'content-type': 'application/json',
        ...(options.prefer ? { prefer: options.prefer } : {}),
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
    });

    const text = await response.text();
    const data = text ? JSON.parse(text) : null;

    if (!response.ok) {
      const error = new Error(data?.message || data?.error || 'Supabase request failed');
      error.statusCode = response.status;
      throw error;
    }

    return data || [];
  }

  return {
    kind: 'supabase',
    createRoom,
    getRoom,
    updateRoom,
    addParticipant,
    toggleParticipantDate,
  };
}

function toRoom(row, participants) {
  return {
    id: row.id,
    title: row.title,
    confirmedDate: row.confirmed_date || '',
    createdAt: row.created_at,
    participants: participants.map(toParticipant),
  };
}

function toParticipant(row) {
  return {
    id: row.id,
    name: row.name,
    color: row.color,
    availableDates: row.available_dates || [],
    createdAt: row.created_at,
  };
}

function toParticipantRow(participant) {
  return {
    id: participant.id,
    room_id: participant.room_id,
    name: participant.name,
    color: participant.color,
    available_dates: participant.available_dates,
  };
}

function normalizeText(value) {
  return String(value || '').trim();
}

function createId(prefix) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function notFound(message) {
  const error = new Error(message);
  error.statusCode = 404;
  return error;
}

function normalizeSupabaseBaseUrl(value) {
  return String(value || '').replace(/\/+$/, '').replace(/\/rest\/v1$/, '');
}

module.exports = {
  createSupabaseRoomStore,
  normalizeSupabaseBaseUrl,
};
