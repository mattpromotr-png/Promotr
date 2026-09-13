# Twilio and channel messaging plan

This is the compact source of truth for the SMS implementation. Keep the existing n8n
exports as a fallback, but new SMS work and the future direct Instagram integration run
inside the deployed Next.js application on Vercel.

## Product decisions

- Use the existing Canadian Twilio number and Twilio Programmable Messaging.
- Use Vercel route handlers; no Python service or n8n workflow is required for SMS.
- Keep one shared guest-concierge AI policy with thin SMS and Instagram adapters.
- Use deterministic templates for booking notifications. Do not spend OpenAI tokens on
  predictable transactional messages.
- Call OpenAI only for genuine inbound guest questions that need a conversational answer.
- One model call at most per inbound message, with a bounded recent-message window.
- A booking inquiry remains unconfirmed until staff sets it to `booked`.

## SMS notification catalogue

Two initial booking templates are sufficient; booking type does not require three separate
messages.

| Event                             | Message behavior                                                                                         |
| --------------------------------- | -------------------------------------------------------------------------------------------------------- |
| Inquiry submitted without payment | Say the inquiry was received, is not confirmed, and include the private management link.                 |
| Deposit received                  | Confirm the deposit amount, say the request is being processed, and include the private management link. |
| Guest updates booking             | Confirm which booking was updated and say availability will be rechecked.                                |
| Admin updates booking             | Describe the changed date, time, party size, type, or table without exposing internal notes.             |
| Status becomes booked             | Send the approved confirmation, arrival guidance, venue location, and ID reminder.                       |
| Booking cancelled or refunded     | Confirm cancellation/refund status and provide a contact path when needed.                               |
| Reminder (later phase)            | Send one configurable reminder before the booking; no promotional content.                               |

All templates identify Promotr, remain short, and support `STOP`. Store the exact rendered
text so staff can see what the guest received.

## Conversation behavior

1. Twilio sends inbound SMS to `POST /api/webhooks/twilio/inbound`.
2. The route validates the Twilio signature, normalizes the phone number to E.164, and
   deduplicates with `MessageSid`.
3. Supabase resolves the person, SMS identity, conversation, lead links, and recent context.
4. If automatic replies are explicitly paused, store the message for staff without replying.
5. Otherwise, deterministic safety/handoff rules run before one optional AI call. A staff-attention
   flag does not by itself pause later concierge replies.
6. The SMS adapter sends the response and stores the Twilio SID.
7. `POST /api/webhooks/twilio/status` updates queued, sent, delivered, undelivered, or failed.

Human requests, complaints, refunds, sensitive issues, and unknown staff-only decisions move
the conversation to Human follow-up. Staff replies from the dashboard through the same SMS
conversation.

## Database evolution

Do not rename existing production tables now; that would create unnecessary migration risk.
Their intended meanings are:

- `contacts`: one guest/person at a venue.
- `conversations`: one channel-specific thread for that contact.
- `messages`: every inbound and outbound message for every channel.
- `leads`: one booking inquiry.

Add only these clear structures:

- `contact_channels`: maps a contact to an SMS phone number, Instagram scoped ID, or future
  channel identity. Unique by venue, channel, and normalized external address.
- `lead_conversations`: joins one inquiry to one or more conversations, allowing the same
  booking to have both SMS and Instagram threads.
- `sms_consents`: records consent source, status, opt-in time, opt-out time, and evidence.
- `outbound_notifications`: stores a unique booking event key, template, rendered content,
  status, Twilio SID, attempts, and error. Its unique event key prevents duplicate SMS during
  webhook or Vercel retries.

Extend `conversations.channel` to include `sms`. Continue using `messages` for the visible
transcript and delivery state. Link an SMS conversation automatically when its normalized
phone number exactly matches the inquiry phone. Link Instagram through an authenticated
conversation/booking path or staff action; never merge people using only a similar name.

## Application structure

```text
src/lib/messaging/
  contract.ts                 # channel-neutral inbound/outbound types
  orchestrator.ts             # context, rules, AI decision, handoff
  templates/booking-sms.ts    # deterministic transactional messages
  channels/twilio.ts          # send, signature validation, normalization
  channels/meta.ts            # future direct Instagram send/normalization

src/app/api/webhooks/twilio/inbound/route.ts
src/app/api/webhooks/twilio/status/route.ts
```

Use the current AI prompt and venue facts through the shared orchestrator; do not create two
large duplicated prompts called “SMS agent” and “Instagram agent.” The reusable agent is the
orchestrator plus policy. Channel adapters only handle transport limits and provider APIs.

## Admin experience

- Conversations page: `All`, `SMS`, and `Instagram` filters with unread and human-follow-up
  indicators.
- Conversation detail: complete scrollable transcript, delivery state, explicit pause/resume
  control, direct staff reply, primary phone identity, and every linked inquiry. Staff replies do
  not implicitly pause the concierge.
- Inquiry detail: channel tabs for SMS and Instagram; both stay linked to the same inquiry.
- If a channel has no conversation, show a clear empty state. For an inquiry with valid SMS
  consent, staff may start an SMS thread.
- Follow-ups remain one combined queue, with a visible channel badge.

## Security and compliance

- Keep Twilio keys and auth tokens only in Vercel server environment variables.
- Prefer a restricted Twilio API key for sending; use the auth token only where Twilio
  signature validation requires it.
- Validate every inbound and status webhook and use provider IDs for idempotency.
- Add explicit booking-form SMS consent; identify the sender and support opt-out.
- Store minimum necessary message and consent data. Never place payment-card data in SMS.
- Respect Twilio `STOP` handling and never allow AI or staff actions to bypass opt-out.

## Implementation gates

1. **Foundation:** migration, environment validation, Twilio adapter, templates, unit tests.
2. **Transactional SMS:** inquiry, paid deposit, guest update, admin update, booked,
   cancellation/refund; delivery callbacks and retry-safe event records.
3. **Two-way SMS:** signed inbound webhook, shared conversation persistence, opt-out and
   human-handoff behavior.
4. **Admin inbox:** channel filters, SMS transcript, delivery badges, staff replies, and
   inquiry channel tabs.
5. **AI concierge:** connect the existing bounded AI orchestration only for inbound questions;
   regression-test booking links, multilingual replies, safety, and takeover.
6. **Direct Instagram later:** implement the Meta adapter against the same orchestrator and
   database after access is available; leave n8n files untouched as fallback/reference.
7. **Live acceptance:** Twilio test number, Canadian destination, STOP/START, duplicate
   webhook, failed delivery, staff takeover, booking update, and production Vercel checks.

## Required owner inputs before live activation

- Twilio Account SID and a restricted API key SID/secret entered directly in Vercel.
- SMS-capable Twilio number or Messaging Service SID.
- Approved venue name, address/location text, contact wording, and confirmation rules.
- Approval for the booking-form consent wording and message catalogue.
