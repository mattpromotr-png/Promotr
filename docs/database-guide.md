# Promotr database guide

This is the plain-language map of the Supabase `public` schema. Keep the current
table names stable: the application, database functions, Stripe/Twilio webhooks,
and migrations already depend on them. Renaming production tables is high risk
and provides little operational value. Use this guide and Supabase table comments
for clarity instead.

## Venue and guest identity

| Table | Purpose |
| --- | --- |
| `venues` | Venue profile, configuration, facts, timezone, and booking URL. |
| `contacts` | One guest identity owned by a venue. |
| `contact_channels` | Phone number, Instagram identity, or web-preview identity belonging to a contact. SMS phone numbers are normalized here. |

## Conversations

| Table | Purpose |
| --- | --- |
| `conversations` | One guest thread per contact and channel, including open/follow-up state and the automatic-reply pause flag. |
| `messages` | Individual inbound guest, automatic concierge, and staff messages with delivery information. |
| `lead_conversations` | Links one inquiry to one or more SMS, Instagram, or website conversations. |
| `webhook_events` | Deduplicates and tracks incoming Meta webhook events. |

## Booking operations

| Table | Purpose |
| --- | --- |
| `leads` | Main booking inquiry: guest, requested date, party size, booking type, preferences, status, and recorded revenue. |
| `lead_submission_attempts` | Rate-limit audit used to prevent booking-form abuse. |
| `club_tables` | Club floor inventory, table capacity, zone, minimum spend, deposit, and map position. |
| `table_bookings` | Table hold/payment/booking record for a particular date. Prevents double booking. |
| `booking_change_history` | Audit trail of guest and admin booking changes. |

## SMS operations

| Table | Purpose |
| --- | --- |
| `sms_consents` | Records whether a phone number opted in or opted out of SMS. |
| `outbound_notifications` | Idempotency and delivery audit for automatic transactional SMS messages. |

## Safe management rules

- Do not manually delete paid `table_bookings`, their leads, or financial history.
- Do not edit normalized phone numbers directly; use the application workflow.
- Apply schema changes through a new migration, never by renaming tables ad hoc.
- Add descriptions in Supabase with `COMMENT ON TABLE` when more clarity is needed.
- Archive old operational data later with an explicit retention policy rather than
  deleting records casually.
