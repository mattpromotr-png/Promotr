# Promotr Instagram AI Host MVP

Promotr is a single-venue Instagram concierge demo for Promotr Nightclub. It answers grounded venue questions, qualifies booking intent, sends guests to a booking-inquiry form, and surfaces leads or human-handoff flags to an authenticated owner.

An inquiry is never a confirmed reservation. This MVP does not provide live availability, guaranteed entry, payments, CRM integration, or multi-venue onboarding.

## Local development
 
Requirements: Node.js 20.9 or newer and npm.

```powershell
cd F:\Promotr
npm.cmd install
Copy-Item .env.example .env.local
npm.cmd run dev
```

Open:

- Booking form: `http://localhost:3000/book`
- Admin login: `http://localhost:3000/admin/login`
- Health check: `http://localhost:3000/api/health`

The booking page and client-side validation work without external credentials. A real submission, admin login, Meta webhook processing, and Instagram replies require their corresponding services below.

## Architecture

1. Meta signs and sends an Instagram event to `/api/webhooks/meta`.
2. Next.js validates, normalizes, deduplicates, and forwards it to an authenticated n8n webhook.
3. n8n atomically loads/stores conversation context through Supabase RPC, applies deterministic safety rules, requests one structured OpenAI response when needed, appends the trusted booking URL, sends through Meta, and stores the outcome.
4. Guests submit `/book`; the server validates, rate-limits, and stores the inquiry through Supabase.
5. The configured Supabase Auth user reviews it at `/admin/leads`.

Detailed boundaries are in `docs/architecture.md`.

## Supabase setup

1. Create a Supabase project.
2. Run `supabase/migrations/202608310001_initial_schema.sql` in the SQL editor.
3. Run `supabase/seed.sql`.
4. In Authentication, create the demo owner user using the same email as `ADMIN_EMAIL`.
5. Add the project URL, anon key, and service-role key to `.env.local`. The service-role key is server-only.
6. Update the seeded `booking_form_url` after deployment.
7. Run each later migration in filename order, including `202609070001_booking_changes_and_email.sql` for rescheduling, audit history, and booking email tracking.

Public/anonymous users have no table-read policy. Lead creation goes through the validated server endpoint and service-role RPC only. The application independently requires an authenticated user whose email matches `ADMIN_EMAIL` before using privileged lead operations.

## n8n import

Import `n8n/promotr-instagram-host.workflow.json`, then select or create these credentials:

- `Promotr n8n shared secret`: header name `X-Promotr-Secret`, value matching `N8N_SHARED_SECRET` in Vercel.
- `Promotr Supabase service role`: use n8n's **Supabase API** credential. Set Host to the project URL (without `/rest/v1`) and Secret Key to the Supabase service-role key.
- `Promotr OpenAI bearer token`: use n8n's **OpenAI API** credential and enter the API key directly in n8n.
- `Promotr Meta bearer token`: `Authorization: Bearer META_ACCESS_TOKEN`.

Open **Runtime Configuration** and replace the placeholders for:

- `supabaseUrl`
- `openaiModel`
- `metaGraphApiVersion` using the currently supported version selected for the Meta app

Optional n8n Variables `OPENAI_INPUT_COST_PER_M` and `OPENAI_OUTPUT_COST_PER_M` support cost observability and default to zero when omitted.

Activate the workflow and copy its production webhook URL into `N8N_INSTAGRAM_WEBHOOK_URL`. Do not commit an exported workflow after credentials have been embedded.

### Testing without Meta

Import `n8n/promotr-instagram-host.mock-test.workflow.json` as a separate, inactive test workflow. It replaces only Meta delivery with a generated `mock-<providerMessageId>` value, then executes the real outbound-storage RPC. Configure its Webhook Header Auth, Supabase API, OpenAI API, and Runtime Configuration exactly as in the production workflow. Use its test webhook URL with unique provider message IDs, verify inbound/outbound rows and admin handoffs, and never use or activate this mock workflow for production traffic.

## Meta Instagram configuration

Follow [docs/meta-setup.md](docs/meta-setup.md). It records the selected Instagram Login path, required scopes, webhook field, endpoint/ID mapping, development-mode roles, and exact live-test sequence. Keep Meta passwords out of the setup process; use Meta authorization and access tokens only.

## Environment ownership

| Variable                         | Local            | Vercel | n8n                  |
| -------------------------------- | ---------------- | ------ | -------------------- |
| `NEXT_PUBLIC_APP_URL`            | yes              | yes    | no                   |
| Supabase URL + anon key          | yes              | yes    | runtime config       |
| Supabase service-role key        | server only      | yes    | credential           |
| `ADMIN_EMAIL`, rate-limit secret | yes              | yes    | no                   |
| Meta app secret + verify token   | yes              | yes    | no                   |
| Meta access token                | optional         | no     | credential           |
| n8n URL + shared secret          | yes              | yes    | webhook credential   |
| OpenAI key + model               | tests only/model | no     | credential + runtime |
| `RESEND_API_KEY`                 | server only      | yes    | no                   |
| `BOOKING_EMAIL_FROM`             | yes              | yes    | no                   |

Never prefix secrets with `NEXT_PUBLIC_` or expose them to browser code.

## Booking management email

The verified Stripe payment flow sends the guest a private management link through Resend. Create a Resend account, verify the venue's sending domain, create an API key, then set `RESEND_API_KEY` and `BOOKING_EMAIL_FROM` locally and in Vercel. The free Resend tier is suitable for demo traffic; current provider quotas should be checked before production launch. Email failure never reverses a successful payment, and the success page still shows the same private management link.

Guests may change the date, party size, or table until 48 hours before the event when the replacement uses the same deposit. Capacity and duplicate-table checks run atomically in Supabase. Different deposit tiers require staff handling so the recorded Stripe payment is never silently changed. Admins may override the time cutoff, and all operational booking changes are recorded in `booking_change_history`.

## Commands

```powershell
npm.cmd run dev          # local application
npm.cmd run lint         # ESLint
npm.cmd run typecheck    # strict TypeScript
npm.cmd test             # Vitest unit/integration tests
npm.cmd run test:e2e     # Playwright desktop + mobile booking path
npm.cmd run build        # production build
```

Install the Playwright browser once with `npx.cmd playwright install chromium` if it is missing.

## Deployment

1. Push the repository to the deployment source and import it into Vercel.
2. Configure Vercel environment variables from `.env.example`.
3. Deploy and verify `/api/health`.
4. Update the venue booking URL in Supabase to the deployed `/book` URL.
5. Configure Meta's callback as `https://YOUR_DOMAIN/api/webhooks/meta` and use the same verify token as Vercel.
6. Subscribe the Instagram professional account to the required message webhook field(s) using the official Meta app flow selected for the account.
7. Activate n8n, send a development-mode DM from a permitted tester, and verify one inbound and one outbound message in Supabase.

Business verification, required permissions/app review, account authorization, messaging windows, and rate limits must be confirmed before claiming external-customer readiness.

## Privacy and retention

Promotr stores only the contact, conversation, message, and inquiry fields needed for this demo. Logs must mask guest contact information and never include tokens or raw secrets. Before production use, the owner must select a retention period and deletion process appropriate to local privacy requirements.

## Current limitations and deferred backlog

- Live external services are not connected in the repository.
- Human handoff is surfaced in admin; no external staff-notification destination is selected.
- Exact address, live availability, and special-event schedules are not supplied.
- Deferred: CRM/reservations, additional channels, full inbox, campaigns, analytics, payments, billing, onboarding, and post-visit automation.
