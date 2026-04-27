# Deploy Nolaboda

This project is ready for a Node web service host. Render is the simplest path because it can run `server.js` directly.

## 1. Confirm Supabase

Supabase must already have:

- The tables from `supabase-schema.sql`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

Keep the service role key server-side only.

## 2. Put the Project on GitHub

Create a private GitHub repository and push this folder.

Make sure these files are not uploaded:

- `.env`
- `rooms.db.json`

They are already listed in `.gitignore`.

## 3. Create a Render Web Service

In Render:

1. New
2. Web Service
3. Connect the GitHub repository
4. Runtime: Node
5. Build command: `npm install`
6. Start command: `npm start`
7. Health check path: `/healthz`
8. Add environment variables:

```text
SUPABASE_URL=your Supabase project URL
SUPABASE_SERVICE_ROLE_KEY=your Supabase service role key
```

If you use Render Blueprints, `render.yaml` already defines the service and prompts for the secret values.

## 4. Verify

After deploy finishes, open:

```text
https://your-render-service.onrender.com/healthz
```

Expected response:

```json
{"ok":true,"store":"supabase"}
```

Then open the app URL, create a room, add a participant, select a date, and refresh the page. If the selected date remains, Supabase persistence is working.

## Local Commands

```powershell
npm.cmd test
npm.cmd start
```
