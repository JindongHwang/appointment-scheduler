const path = require('node:path');
const { createRoomStore } = require('./roomStore');
const { createSupabaseRoomStore } = require('./supabaseRoomStore');

function createConfiguredRoomStore(options = {}) {
  const env = options.env || process.env;
  const dbPath = options.dbPath || env.DB_PATH || path.join(__dirname, 'rooms.db.json');
  const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SECRET_KEY;

  if (env.SUPABASE_URL && supabaseKey) {
    return createSupabaseRoomStore({
      supabaseUrl: env.SUPABASE_URL,
      serviceRoleKey: supabaseKey,
    });
  }

  return createRoomStore(dbPath);
}

module.exports = {
  createConfiguredRoomStore,
};
