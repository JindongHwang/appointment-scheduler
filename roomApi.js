// Talks to the Supabase functions defined in supabase-schema.sql.
// The browser calls them directly, so there is no server in between.

function createRoomApi(options = {}) {
  const baseUrl = normalizeSupabaseUrl(options.supabaseUrl);
  const key = String(options.supabaseKey || '').trim();
  const fetchImpl = options.fetch || ((...args) => fetch(...args));

  if (!baseUrl || !key) {
    throw new Error('Supabase 주소와 공개 키가 필요해요.');
  }
  if (isSecretKey(key)) {
    throw new Error('비밀 키는 웹페이지에 넣으면 안 돼요. config.js에는 공개(publishable) 키를 넣어 주세요.');
  }

  async function rpc(name, args) {
    let response;
    try {
      response = await fetchImpl(`${baseUrl}/rest/v1/rpc/${name}`, {
        method: 'POST',
        headers: buildHeaders(key),
        body: JSON.stringify(args),
      });
    } catch {
      throw new Error(
        '서버에 연결하지 못했어요. 인터넷 연결을 확인해 주세요. 계속 안 되면 Supabase 프로젝트가 일시정지된 것일 수 있어요.'
      );
    }

    const text = await response.text();
    let data = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = null;
    }

    if (!response.ok) {
      throw new Error(describeFailure(response.status, data));
    }
    return data;
  }

  async function getRoom(roomId) {
    const room = await rpc('get_room', { p_room_id: roomId });
    if (!room) {
      throw new Error("약속을 찾을 수 없어요. 초대 링크를 다시 확인하거나 '새 약속'을 눌러 주세요.");
    }
    return room;
  }

  function updateRoom(roomId, updates = {}) {
    const args = { p_room_id: roomId };
    if (Object.prototype.hasOwnProperty.call(updates, 'title')) {
      args.p_title = String(updates.title || '');
    }
    if (Object.prototype.hasOwnProperty.call(updates, 'confirmedDate')) {
      args.p_confirmed_date = String(updates.confirmedDate || '');
    }
    return rpc('update_room', args);
  }

  return {
    createRoom: (input = {}) => rpc('create_room', { p_title: String(input.title || '') }),
    getRoom,
    updateRoom,
    addParticipant: (roomId, name) => rpc('add_participant', { p_room_id: roomId, p_name: String(name || '') }),
    removeParticipant: (roomId, participantId) =>
      rpc('remove_participant', { p_room_id: roomId, p_participant_id: participantId }),
    toggleParticipantDate: (roomId, participantId, date) =>
      rpc('toggle_participant_date', {
        p_room_id: roomId,
        p_participant_id: participantId,
        p_date: date,
      }),
  };
}

// Returns null when config.js has not been filled in, so the page can fall back to the local demo.
function createConfiguredRoomApi(config, options = {}) {
  if (!config || !String(config.supabaseUrl || '').trim() || !String(config.supabaseKey || '').trim()) {
    return null;
  }
  return createRoomApi({ ...config, ...options });
}

// Turns the common setup problems into a message that says what to do.
function describeFailure(status, data) {
  const code = data && data.code;
  if (status === 540) {
    return 'Supabase 프로젝트가 일시정지돼 있어요. Supabase 대시보드에서 프로젝트를 다시 켜 주세요.';
  }
  if (code === 'PGRST202' || code === 'PGRST205') {
    return 'Supabase에 필요한 함수가 없어요. SQL Editor에서 supabase-schema.sql을 실행해 주세요.';
  }
  if (status === 401 || status === 403 || code === '42501') {
    return 'Supabase가 요청을 거부했어요. config.js의 주소와 공개 키를 확인하고, supabase-schema.sql을 다시 실행해 주세요.';
  }
  return (data && (data.message || data.error)) || '요청에 실패했어요.';
}

function normalizeSupabaseUrl(value) {
  return String(value || '')
    .trim()
    .replace(/\/+$/, '')
    .replace(/\/rest\/v1$/, '');
}

function buildHeaders(key) {
  const headers = {
    'Content-Type': 'application/json',
    apikey: key,
  };
  // Legacy anon keys are JWTs and also go in Authorization. The newer sb_publishable_ keys must not.
  if (key.startsWith('eyJ')) {
    headers.Authorization = `Bearer ${key}`;
  }
  return headers;
}

function isSecretKey(key) {
  if (key.startsWith('sb_secret_')) return true;
  if (!key.startsWith('eyJ')) return false;

  try {
    const payload = key.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const decoded = typeof atob === 'function'
      ? atob(payload)
      : Buffer.from(payload, 'base64').toString('utf8');
    return JSON.parse(decoded).role === 'service_role';
  } catch {
    return false;
  }
}

if (typeof module !== 'undefined') {
  module.exports = {
    createRoomApi,
    createConfiguredRoomApi,
    normalizeSupabaseUrl,
    describeFailure,
    buildHeaders,
    isSecretKey,
  };
}
