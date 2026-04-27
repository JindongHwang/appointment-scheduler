# Nolaboda

A small shared scheduling app for picking dates with friends.

## Run Locally

```powershell
npm start
```

Open:

```text
http://127.0.0.1:3000/
```

Without Supabase environment variables, rooms are saved to `rooms.db.json`.

## Enable Supabase Storage

1. Create a Supabase project.
2. Open the Supabase SQL editor.
3. Run the SQL in `supabase-schema.sql`.
4. Copy `.env.example` to `.env`.
5. Fill in:

```text
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

6. Start the server. The app automatically reads `.env`.

In PowerShell:

```powershell
$env:SUPABASE_URL="https://your-project.supabase.co"
$env:SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
npm start
```

The service role key must stay server-side. Do not paste it into `app.js`, `index.html`, or any public client code.

## Deploy

Use a Node hosting service such as Render, Railway, Fly.io, or a VPS. See `DEPLOY.md` for the Render path.

Set these environment variables on the host:

```text
PORT=3000
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

Start command:

```text
npm start
```

After deployment, open the public URL. The app creates a room automatically and shows an invite link that friends can use.

## Test

```powershell
node scheduler.test.js
node roomStore.test.js
node storeFactory.test.js
node envLoader.test.js
node supabaseRoomStore.test.js
node api.test.js
node --check app.js
node --check server.js
node --check supabaseRoomStore.js
node --check storeFactory.js
node --check envLoader.js
```

Or run everything:

```powershell
npm test
```
