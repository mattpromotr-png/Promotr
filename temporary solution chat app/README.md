# Promotr AI Host Preview

Temporary web-chat simulator for testing the Promotr AI host before Meta access is available. It has no Instagram, database, n8n, authentication, or persistent memory.

## Local setup

```powershell
Copy-Item .env.example .env.local
npm.cmd install
npm.cmd run dev
```

Set `OPENAI_API_KEY`, `OPENAI_MODEL`, and the deployed main application's `/book` URL as `BOOKING_FORM_URL` in `.env.local`. Open `http://localhost:3000`.

## Vercel

Create a separate Vercel project using **Root Directory** `temporary solution chat app`. Add the three environment variables and deploy. Use restricted sharing or Vercel Deployment Protection: the included in-memory rate limit is best-effort and is not globally durable across serverless instances.

The server-owned prompt and venue facts are in `src/lib/ai.ts`. Conversation history exists only in the current browser tab's `sessionStorage`. Meta/Instagram is not connected.
