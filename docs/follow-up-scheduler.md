# Conversation follow-up scheduler

The application exposes `POST /api/cron/conversation-follow-ups`. It processes at most 25 due, opted-in SMS conversations per run and requires `Authorization: Bearer <CRON_SECRET>`.

Use Supabase Cron to call this endpoint every 15 minutes. Do not add a frequent `vercel.json` cron while the project uses Vercel Hobby: Hobby cron schedules can run only once per day. Supabase Cron supports frequent schedules and keeps this feature within the existing backend.

## Owner setup

1. Add a random `CRON_SECRET` of at least 16 characters to Vercel.
2. Store the production application URL and the same secret in Supabase Vault.
3. In Supabase **Integrations → Cron**, create a 15-minute HTTP job that sends a POST request to `https://<production-domain>/api/cron/conversation-follow-ups` with the authorization header.
4. Enable a follow-up on one test SMS conversation, use a short delay, and verify one message, database attempt count, translation metadata, and automatic stop.

The endpoint claims each due record before sending to prevent duplicate messages. Guest replies reset the timer. Opted-out guests are disabled automatically.
