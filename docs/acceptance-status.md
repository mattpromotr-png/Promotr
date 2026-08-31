# Acceptance status

Reviewed against the original client contract on 2026-08-31 after fixture-backed implementation.

| #   | Criterion                                                   | Status and evidence                                                                                                                                                                                                |
| --- | ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | Meta webhook verification succeeds                          | Implemented in `src/app/api/webhooks/meta/route.ts`; raw challenge route test passes. Live Meta dashboard verification waits for credentials/domain.                                                               |
| 2   | Repeated Instagram text event is processed once             | Provider message ID is unique in `webhook_events`; repeated-delivery route test confirms one n8n forward.                                                                                                          |
| 3   | AI answers venue FAQs accurately and concisely              | Complete versioned venue facts plus FAQ acceptance fixtures cover music, hours, cover, dress code, guest list, arrival, bottles, age/capacity source data. Live model evaluation waits for OpenAI/n8n credentials. |
| 4   | AI never confirms a booking                                 | Prompt rule, output fixtures, success copy, and deterministic false-confirmation postprocessor in both TypeScript and n8n.                                                                                         |
| 5   | AI asks only for missing qualification details              | Bounded recent context, structured `missingQualificationFields`, one-question rule, and guest-list/birthday multi-turn fixtures. Live model evaluation remains required.                                           |
| 6   | Correct booking URL is shared when appropriate              | Model cannot supply URLs; `finalizeAiReply`/n8n append only the database-configured URL when `shareBookingForm` is true.                                                                                           |
| 7   | Complaints and unknown/high-risk cases require handoff      | Deterministic complaint/sensitive rules, unknown-event fixture, persisted conversation status/reason, and independent Human follow-up admin section.                                                               |
| 8   | Booking validation works client and server                  | One shared Zod schema, honeypot, future-date/contact/conditional validation, 26-test suite, and desktop/mobile Playwright path.                                                                                    |
| 9   | Valid inquiry is stored and visible to authenticated admin  | Atomic Supabase RPC, schema/RLS, protected owner check, newest-first/filter/update admin. Live Supabase execution waits for project credentials.                                                                   |
| 10  | Secrets are absent from client, logs, and committed content | Server-only boundaries, masked operational logs, placeholder-only env example/workflow, and credential-pattern scan pass. This directory has no Git repository/history to scan yet.                                |
| 11  | Critical automated tests pass                               | ESLint, strict TypeScript, Vitest, desktop/mobile Playwright, workflow JSON parse, and production build pass in the current environment.                                                                           |
| 12  | README supports setup without guessing                      | `README.md`, `docs/meta-setup.md`, `docs/demo-script.md`, environment ownership, service imports, deployment, limitations, and live-test sequence are present.                                                     |

## Exact live blockers

The repository is fixture-backed complete but cannot truthfully claim a live end-to-end Instagram demo until the owner supplies/configures these directly in the relevant platforms:

1. Supabase project, migration/seed execution, and owner Auth account.
2. n8n Cloud workspace with imported workflow, runtime configuration, and selected credentials.
3. OpenAI API credential and selected model; optional cost variables may remain unset.
4. Meta app/account authorization, required scopes, access token, app secret, verify token, account ID, webhook subscription, and development tester role.
5. Vercel project/domain with server-side environment variables.

Do not send passwords or raw secrets in chat. Enter credentials directly in Supabase, n8n, Meta, Vercel, and local `.env.local` as documented.
