function resolveInitialRoomId(search, savedRoomId) {
  const params = new URLSearchParams(search || '');
  return params.get('room') || savedRoomId || '';
}

function buildRoomUrl(currentUrl, roomId) {
  const url = new URL(currentUrl);
  url.searchParams.set('room', roomId);
  return url.toString();
}

if (typeof module !== 'undefined') {
  module.exports = {
    resolveInitialRoomId,
    buildRoomUrl,
  };
}
