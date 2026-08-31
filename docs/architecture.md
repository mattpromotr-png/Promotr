# Architecture

## Runtime flow

```text
Instagram guest
  -> Meta webhook (/api/webhooks/meta)
  -> signature + event validation
  -> deterministic filtering + provider-message idempotency
  -> normalized event forwarded with shared-secret authentication
  -> n8n workflow
       -> Supabase: contact/conversation/recent messages + venue config
       -> deterministic handoff checks
       -> OpenAI: one structured response
       -> Zod-equivalent output enforcement / safe fallback
       -> Meta outbound reply
       -> Supabase inbound/outbound status + operational metadata

Instagram reply containing booking-form URL
  -> public form (/book)
  -> validated server endpoint (honeypot + rate limit + idempotency)
  -> Supabase lead
  -> protected admin list (/admin/leads)
```

## Trust boundaries

- Browser: public Supabase key only; never receives service-role, Meta, OpenAI, or n8n secrets.
- Next.js server: validates untrusted form/webhook inputs and owns server-only credentials.
- n8n: accepts only authenticated normalized events and owns orchestration credentials.
- Supabase: row-level security denies public lead reads; server inserts use controlled server credentials; authenticated permitted admins read/update leads.
- Meta: official webhook and messaging endpoints only. Raw events are minimized before forwarding.

## Idempotency and retries

- Meta provider message ID is the primary webhook idempotency key and is unique in `messages` when present.
- Booking submissions carry a server-issued idempotency token and a short-lived rate-limit key.
- Echoes and unsupported events are discarded before AI work.
- Retry only transient network/rate-limit/server failures with a small bounded exponential schedule. Permanent failures are logged and do not loop.

## Planned source layout

```text
src/
  app/
    api/health/route.ts
    api/leads/route.ts
    api/webhooks/meta/route.ts
    admin/leads/page.tsx
    book/page.tsx
    book/success/page.tsx
  components/
    booking/
    admin/
    ui/
  lib/
    ai/
    meta/
    supabase/
    validation/
    security/
  prompts/
    instagram-host.v1.ts
supabase/
  migrations/
  seed.sql
n8n/
  promotor-instagram-host.workflow.json
tests/
  fixtures/
docs/
```

## Design decisions

- The Meta route remains a thin, fast boundary; n8n owns the conversation workflow.
- Venue facts and AI behavior are separately versioned. Facts are structured data, not hardcoded prose scattered through UI/API code.
- Shared Zod schemas define form payloads, normalized Meta events, and AI outputs.
- The admin is a lead/handoff view only. No mock inbox, fake analytics, or reservation-confirmation UI.
- A small local/server rate limiter is acceptable for local tests; production uses a durable Vercel-compatible store or documented deployment binding.
