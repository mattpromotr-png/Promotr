# Instagram messaging rollout (2026-09-21)

## Decision

Use **one active Instagram n8n workflow** only for the signed Meta webhook handoff. The Next.js application owns identity, persistence, Vera's scenario prompts, bounded memory, translations, handoff, manager notifications, and outbound delivery. This avoids maintaining a second, drifting prompt/agent in n8n. The old mock workflow remains inactive. SMS and web-preview routes are unchanged.

Flow: Instagram DM -> signed `/api/webhooks/meta` -> verified/deduplicated event -> n8n `promotr-instagram` -> authenticated `/api/internal/instagram/events` -> Supabase conversation/message -> shared Vera engine -> Instagram Send API -> web/mobile manager inbox.

## Local implementation

- [x] Replace the production workflow export with the small handoff workflow.
- [x] Add Instagram Send API and shared application-side processing.
- [x] Add Instagram staff replies and automation pause/resume to the web dashboard and mobile API.
- [x] Add per-conversation quiet-window claim, translation, memory, lost-item/booking links, and staff handoff.
- [x] Keep SMS and Instagram messages separate by channel while using the same guest/contact model.
- [x] Add basic webhook/account/delivery tests.

## Activation gates (do in order)

1. Take a recoverable Supabase backup; confirm the target project and migration ledger. Apply `202609160003_sms_queue_realtime_reads.sql` first if absent, then `202609210001_instagram_concierge_queue.sql`. Do **not** run an earlier migration twice merely because this checklist names it.
2. In Vercel, set the production server-side values: `META_APP_SECRET`, `META_VERIFY_TOKEN`, `META_INSTAGRAM_ACCOUNT_ID`, `META_ACCESS_TOKEN` (the **client's Promotr account** token, not a personal Instagram token), `META_GRAPH_API_VERSION`, `N8N_SHARED_SECRET`, `N8N_INSTAGRAM_WEBHOOK_URL`, `OPENAI_API_KEY`, `OPENAI_MODEL`, Supabase service credentials, and `NEXT_PUBLIC_APP_URL`. Redeploy. Never place secrets in `NEXT_PUBLIC_*`, git, chat, or n8n workflow JSON.
3. Import `n8n/promotr-instagram-host.workflow.json`. Replace `YOUR_PROMOTR_DOMAIN` with the canonical deployed HTTPS domain. Configure inbound and outbound n8n Header Auth credentials with `X-Promotr-Secret` equal to Vercel's `N8N_SHARED_SECRET`. Keep other Instagram workflows inactive; activate this one and copy its **production** webhook URL to Vercel as `N8N_INSTAGRAM_WEBHOOK_URL`.
4. In Meta, set the callback to `https://YOUR_PROMOTR_DOMAIN/api/webhooks/meta`, use Vercel's `META_VERIFY_TOKEN`, and subscribe the Promotr Instagram professional account to `messages`. The configured account ID and access token must refer to that same account. Check required access level and approved permissions before external guests test.
5. Send a permitted test DM. Check one inbound row, one outbound row, provider delivery, and the same transcript in web and mobile manager inboxes. Test: rapid three-message burst, repeat provider message ID, guest asking for a booking link, lost item, direct staff/urgent request, non-English message, staff reply without permanently pausing Vera, explicit pause/resume, and manager notification. Verify links, English-only manager display, timestamps, and no staff-private details or fabricated booking confirmation.
6. Observe n8n/Vercel/Meta errors and message latency. Keep the previous workflow export available for rollback, but **never run two active responders** for the same Instagram account.

## Scope and safety

Meta permits this send path only after the guest initiates the conversation; Instagram messaging windows, app review, permissions, and account ownership still govern actual delivery. A successful local test or webhook HTTP 200 is not proof that a guest received a message. Check Meta's send result and a real device/account. This rollout does not add Instagram proactive follow-up scheduling or media/voice message processing. If a provider rejects an outbound message, staff can see the failed row; automatic retries of ambiguous provider sends should be added only with an idempotency-safe design. An event persisted immediately before a serverless interruption can be reprocessed on a repeat webhook, but there is no independent Instagram queue sweeper yet.
