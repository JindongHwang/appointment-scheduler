const colors = ['#4f9d76', '#ef7d6b', '#5f8fc7', '#e4b94f', '#9b72cf'];
const weekdays = ['일', '월', '화', '수', '목', '금', '토'];
const today = new Date();
const defaultTitle = `${today.getMonth() + 1}월 친구 모임`;
const refreshIntervalMs = 5000;

// config.js가 채워져 있으면 Supabase에 저장하는 공유 모드, 비어 있으면 이 브라우저에만 저장하는 체험 모드.
let roomApi = null;
let configError = '';
try {
  roomApi = createConfiguredRoomApi(window.NOLABODA_CONFIG);
} catch (error) {
  configError = error.message;
}
const isSharedMode = Boolean(roomApi);
const activeParticipantKey = 'nolaboda.activeParticipantId';
const lastRoomKey = 'nolaboda.lastRoomId';

let visibleDate = new Date(today.getFullYear(), today.getMonth(), 1);
let activeParticipantId = window.localStorage.getItem(activeParticipantKey);
let room = null;
let pendingChanges = 0;
let changeCount = 0;

const calendarEl = document.querySelector('#calendar');
const monthLabelEl = document.querySelector('#monthLabel');
const participantListEl = document.querySelector('#participantList');
const bestDatesEl = document.querySelector('#bestDates');
const selectionNoteEl = document.querySelector('#selectionNote');
const participantForm = document.querySelector('#participantForm');
const participantNameInput = document.querySelector('#participantName');
const eventTitleInput = document.querySelector('#eventTitle');
const roomStatusEl = document.querySelector('#roomStatus');
const shareLinkInput = document.querySelector('#shareLink');
const copyLinkButton = document.querySelector('#copyLinkButton');
const newRoomButton = document.querySelector('#newRoomButton');
const saveTitleButton = document.querySelector('#saveTitleButton');

document.querySelector('#prevMonth').addEventListener('click', () => {
  visibleDate = new Date(visibleDate.getFullYear(), visibleDate.getMonth() - 1, 1);
  render();
});

document.querySelector('#nextMonth').addEventListener('click', () => {
  visibleDate = new Date(visibleDate.getFullYear(), visibleDate.getMonth() + 1, 1);
  render();
});

participantForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const name = participantNameInput.value.trim();
  if (!name) return;

  try {
    setStatus('참여자를 추가하고 있어요.');
    const participant = isSharedMode
      ? await change(() => roomApi.addParticipant(room.id, name))
      : addLocalParticipant(name);

    activeParticipantId = participant.id;
    window.localStorage.setItem(activeParticipantKey, activeParticipantId);
    participantNameInput.value = '';
    await refreshRoom();
    setStatus('참여자가 추가됐어요.');
  } catch (error) {
    setStatus(error.message);
  }
});

saveTitleButton.addEventListener('click', async () => {
  const title = eventTitleInput.value.trim() || defaultTitle;
  try {
    if (isSharedMode) {
      room = await change(() => roomApi.updateRoom(room.id, { title }));
    } else {
      room.title = title;
      saveLocalRoom();
    }
    render();
    setStatus('약속 이름을 저장했어요.');
  } catch (error) {
    setStatus(error.message);
  }
});

copyLinkButton.addEventListener('click', async () => {
  shareLinkInput.select();
  try {
    await navigator.clipboard.writeText(shareLinkInput.value);
    setStatus('초대 링크를 복사했어요.');
  } catch {
    document.execCommand('copy');
    setStatus('초대 링크를 복사했어요.');
  }
});

newRoomButton.addEventListener('click', async () => {
  // 다른 사람이 이미 참여한 약속에서 실수로 빠져나가지 않도록 한 번 묻는다.
  if (isSharedMode && room.id && room.participants.length > 0) {
    const leave = window.confirm(
      '지금 약속에서 나가 새 약속을 만들까요?\n원래 약속은 그대로 남고, 초대 링크로 다시 들어올 수 있어요.'
    );
    if (!leave) return;
  }

  try {
    if (isSharedMode) {
      room = await change(() => roomApi.createRoom({ title: defaultTitle }));
      rememberRoom(room.id);
      updateRoomUrl(room.id);
      setConnected(true);
      startAutoRefresh();
    } else {
      room = createLocalRoom();
      saveLocalRoom();
    }
    activeParticipantId = null;
    window.localStorage.removeItem(activeParticipantKey);
    render();
    setStatus('새 약속 링크를 만들었어요.');
  } catch (error) {
    setStatus(error.message);
  }
});

async function init() {
  if (!isSharedMode) {
    try {
      room = loadLocalRoom();
    } catch {
      room = createLocalRoom();
    }
    ensureActiveParticipant();
    render();
    setStatus(configError || 'config.js에 Supabase 주소와 키를 넣으면 친구에게 보낼 수 있는 링크가 생겨요.');
    return;
  }

  try {
    await initSharedRoom();
    setConnected(true);
    startAutoRefresh();
    ensureActiveParticipant();
    render();
  } catch (error) {
    // 연결에 실패하면 예시 데이터 대신 빈 화면과 안내만 보여 준다.
    room = createEmptyRoom();
    setConnected(false);
    render();
    setStatus(error.message);
  }
}

function createEmptyRoom() {
  return { id: '', title: defaultTitle, confirmedDate: '', participants: [] };
}

// 방에 연결되지 않은 동안에는 저장할 곳이 없으므로 입력을 막는다. "새 약속"은 다시 시도하는 용도로 남겨 둔다.
function setConnected(connected) {
  [participantNameInput, participantForm.querySelector('button'), eventTitleInput, saveTitleButton, copyLinkButton].forEach(
    (element) => {
      element.disabled = !connected;
    }
  );
}

async function initSharedRoom() {
  const roomId = resolveInitialRoomId(
    window.location.search,
    window.localStorage.getItem(lastRoomKey)
  );

  if (roomId) {
    try {
      room = await roomApi.getRoom(roomId);
      rememberRoom(room.id);
      updateRoomUrl(room.id);
      setStatus(new URLSearchParams(window.location.search).get('room') ? '초대 링크로 들어왔어요.' : '마지막 약속을 불러왔어요.');
      return;
    } catch (error) {
      window.localStorage.removeItem(lastRoomKey);
      if (new URLSearchParams(window.location.search).get('room')) {
        throw error;
      }
    }
  }

  room = await change(() => roomApi.createRoom({ title: defaultTitle }));
  rememberRoom(room.id);
  updateRoomUrl(room.id);
  setStatus('새 약속 링크를 만들었어요.');
}

async function refreshRoom() {
  if (isSharedMode) {
    room = await roomApi.getRoom(room.id);
  } else {
    saveLocalRoom();
  }
  ensureActiveParticipant();
  render();
}

function render() {
  if (document.activeElement !== eventTitleInput) {
    eventTitleInput.value = room.title;
  }
  shareLinkInput.value = getShareLink();
  renderParticipants();
  renderCalendar();
  renderBestDates();
  renderSelectionNote();
}

function renderParticipants() {
  participantListEl.innerHTML = '';

  if (!room.participants.length) {
    participantListEl.innerHTML = '<li class="empty-copy">이름을 입력하면 날짜를 고를 수 있어요.</li>';
    return;
  }

  room.participants.forEach((participant) => {
    const item = document.createElement('li');
    item.className = 'participant-item';

    const dot = document.createElement('span');
    dot.className = 'dot';
    dot.style.background = participant.color;

    const copy = document.createElement('div');
    const name = document.createElement('span');
    name.className = 'participant-name';
    name.textContent = participant.name;
    const count = document.createElement('span');
    count.className = 'participant-count';
    count.textContent = `${participant.availableDates.length}일 선택`;
    copy.append(name, count);

    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = participant.id === activeParticipantId ? '선택 중' : '선택';
    button.addEventListener('click', () => {
      activeParticipantId = participant.id;
      window.localStorage.setItem(activeParticipantKey, activeParticipantId);
      render();
    });

    item.append(dot, copy, button);
    participantListEl.append(item);
  });
}

function renderCalendar() {
  const year = visibleDate.getFullYear();
  const month = visibleDate.getMonth();
  const summary = summarizeAvailability(room.participants);
  const activeParticipant = getActiveParticipant();

  monthLabelEl.textContent = `${year}년 ${month + 1}월`;
  calendarEl.innerHTML = '';

  weekdays.forEach((weekday) => {
    const header = document.createElement('div');
    header.className = 'weekday';
    header.textContent = weekday;
    calendarEl.append(header);
  });

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  for (let i = 0; i < firstDay; i += 1) {
    const empty = document.createElement('div');
    empty.className = 'day-cell empty';
    calendarEl.append(empty);
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    const date = formatDate(year, month, day);
    const info = summary.dates[date];
    const selectedByMe = activeParticipant?.availableDates.includes(date);
    const cell = document.createElement('button');
    cell.type = 'button';
    cell.className = [
      'day-cell',
      activeParticipant ? 'selectable' : 'disabled',
      summary.bestDates.includes(date) ? 'best' : '',
      selectedByMe ? 'selected-by-me' : '',
    ].join(' ');
    cell.disabled = !activeParticipant;
    cell.addEventListener('click', () => toggleActiveDate(date));

    const number = document.createElement('span');
    number.className = 'day-number';
    number.textContent = day;
    cell.append(number);

    if (info) {
      const count = document.createElement('span');
      count.className = 'availability-count';
      count.textContent = `${info.count}/${room.participants.length}`;
      cell.append(count);
    }

    const dots = document.createElement('div');
    dots.className = 'date-dots';
    room.participants
      .filter((participant) => participant.availableDates.includes(date))
      .forEach((participant) => {
        const dot = document.createElement('span');
        dot.className = 'date-dot';
        dot.style.background = participant.color;
        dot.title = participant.name;
        dots.append(dot);
      });
    cell.append(dots);

    calendarEl.append(cell);
  }
}

function renderBestDates() {
  const summary = summarizeAvailability(room.participants);
  bestDatesEl.innerHTML = '';

  if (!summary.bestDates.length) {
    bestDatesEl.innerHTML = '<p class="empty-copy">아직 선택된 날짜가 없어요.</p>';
    return;
  }

  summary.bestDates.slice(0, 3).forEach((date) => {
    const item = document.createElement('div');
    item.className = 'best-date';

    const title = document.createElement('strong');
    title.textContent = `${formatKoreanDate(date)} (${summary.dates[date].count}/${room.participants.length})`;

    const names = document.createElement('span');
    names.textContent = summary.dates[date].names.join(', ');

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'confirm-button';
    button.textContent = room.confirmedDate === date ? '확정됨' : '확정';
    button.addEventListener('click', () => confirmDate(date));

    item.append(title, names, button);
    bestDatesEl.append(item);
  });
}

function renderSelectionNote() {
  const activeParticipant = getActiveParticipant();
  const base = activeParticipant
    ? `${activeParticipant.name}님이 날짜를 선택 중이에요.`
    : '먼저 이름을 입력해 주세요.';
  selectionNoteEl.textContent = room.confirmedDate
    ? `${base} 확정된 날짜는 ${formatKoreanDate(room.confirmedDate)}입니다.`
    : base;
}

async function toggleActiveDate(date) {
  const activeParticipant = getActiveParticipant();
  if (!activeParticipant) return;

  try {
    if (isSharedMode) {
      room = await change(() => roomApi.toggleParticipantDate(room.id, activeParticipant.id, date));
    } else {
      room.participants = room.participants.map((participant) => {
        if (participant.id !== activeParticipant.id) return participant;
        return { ...toggleDate(participant, date), color: participant.color };
      });
      saveLocalRoom();
    }
    render();
  } catch (error) {
    setStatus(error.message);
  }
}

async function confirmDate(date) {
  try {
    if (isSharedMode) {
      room = await change(() => roomApi.updateRoom(room.id, { confirmedDate: date }));
    } else {
      room.confirmedDate = date;
      saveLocalRoom();
    }
    render();
    setStatus(`${formatKoreanDate(date)}로 확정했어요.`);
  } catch (error) {
    setStatus(error.message);
  }
}

function ensureActiveParticipant() {
  if (room.participants.some((participant) => participant.id === activeParticipantId)) {
    return;
  }

  activeParticipantId = room.participants[0]?.id || null;
  if (activeParticipantId) {
    window.localStorage.setItem(activeParticipantKey, activeParticipantId);
  }
}

function addLocalParticipant(name) {
  const participant = {
    ...createParticipant(name),
    color: colors[room.participants.length % colors.length],
  };
  room.participants.push(participant);
  saveLocalRoom();
  return participant;
}

function loadLocalRoom() {
  const saved = window.localStorage.getItem('nolaboda.localRoom');
  return saved ? JSON.parse(saved) : createLocalRoom();
}

function createLocalRoom() {
  const sample = (...days) => days.map((day) => formatDate(today.getFullYear(), today.getMonth(), day));
  return {
    id: 'local',
    title: defaultTitle,
    confirmedDate: '',
    participants: [
      { ...createParticipant('지혜', sample(2, 10, 17, 24)), color: colors[0] },
      { ...createParticipant('민수', sample(2, 3, 16)), color: colors[1] },
      { ...createParticipant('수빈', sample(2, 16, 23)), color: colors[2] },
    ],
  };
}

function saveLocalRoom() {
  window.localStorage.setItem('nolaboda.localRoom', JSON.stringify(room));
}

// 공유 방을 바꾸는 요청을 감싼다. 진행 중이거나 방금 끝난 변경이 있으면
// 그보다 먼저 출발한 자동 새로고침 결과가 화면을 덮어쓰지 못하게 한다.
async function change(run) {
  pendingChanges += 1;
  changeCount += 1;
  try {
    return await run();
  } finally {
    pendingChanges -= 1;
  }
}

// 다른 사람이 고른 날짜가 새로고침 없이 보이도록 주기적으로 방을 다시 읽는다.
let autoRefreshStarted = false;
function startAutoRefresh() {
  if (autoRefreshStarted) return;
  autoRefreshStarted = true;
  window.setInterval(refreshFromOthers, refreshIntervalMs);
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) refreshFromOthers();
  });
}

async function refreshFromOthers() {
  if (!room || !room.id || document.hidden || pendingChanges > 0) return;

  const roomId = room.id;
  const seenChanges = changeCount;
  try {
    const latest = await roomApi.getRoom(roomId);
    if (pendingChanges > 0 || seenChanges !== changeCount || room.id !== roomId) return;
    if (JSON.stringify(latest) === JSON.stringify(room)) return;
    room = latest;
    ensureActiveParticipant();
    render();
  } catch {
    // 일시적인 오류는 다음 주기에 다시 시도한다.
  }
}

function updateRoomUrl(roomId) {
  window.history.replaceState({}, '', buildRoomUrl(window.location.href, roomId));
}

function getShareLink() {
  if (!isSharedMode) {
    return 'Supabase 설정 후 링크가 표시됩니다.';
  }
  if (!room.id) {
    return '연결되면 링크가 표시됩니다.';
  }

  return buildRoomUrl(window.location.href, room.id);
}

function getActiveParticipant() {
  return room.participants.find((participant) => participant.id === activeParticipantId) || null;
}

function setStatus(message) {
  roomStatusEl.textContent = message;
}

function rememberRoom(roomId) {
  window.localStorage.setItem(lastRoomKey, roomId);
}

function formatDate(year, month, day) {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function formatKoreanDate(date) {
  const parsed = new Date(`${date}T00:00:00`);
  return `${parsed.getMonth() + 1}월 ${parsed.getDate()}일`;
}

init();
