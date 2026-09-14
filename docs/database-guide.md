# Promotr database guide

Live structure was audited on 2026-09-14. See
[`database-audit-2026-09-14.md`](database-audit-2026-09-14.md) for verified
schema coverage, aggregate health checks, security checks, and the safe expansion
sequence. Record future changes in
[`database-migration-ledger.md`](database-migration-ledger.md).

This is the plain-language map of the Supabase `public` schema. Keep the current
table names stable: the application, database functions, Stripe/Twilio webhooks,
and migrations already depend on them. Renaming production tables is high risk
and provides little operational value. Use this guide and Supabase table comments
for clarity instead.

## Venue and guest identity

| Table              | Purpose                                                                                                                  |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------ |
| `venues`           | Venue profile, configuration, facts, timezone, and booking URL.                                                          |
| `contacts`         | One guest identity owned by a venue.                                                                                     |
| `contact_channels` | Phone number, Instagram identity, or web-preview identity belonging to a contact. SMS phone numbers are normalized here. |

## Conversations

| Table                | Purpose                                                                                                      |
| -------------------- | ------------------------------------------------------------------------------------------------------------ |
| `conversations`      | One guest thread per contact and channel, including open/follow-up state and the automatic-reply pause flag. |
| `messages`           | Individual inbound guest, automatic concierge, and staff messages with delivery information.                 |
| `lead_conversations` | Links one inquiry to one or more SMS, Instagram, or website conversations.                                   |
| `webhook_events`     | Deduplicates and tracks incoming Meta webhook events.                                                        |

## Booking operations

| Table                      | Purpose                                                                                                           |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `leads`                    | Main booking inquiry: guest, requested date, party size, booking type, preferences, status, and recorded revenue. |
| `lead_submission_attempts` | Rate-limit audit used to prevent booking-form abuse.                                                              |
| `club_tables`              | Club floor inventory, table capacity, zone, minimum spend, deposit, and map position.                             |
| `table_bookings`           | Table hold/payment/booking record for a particular date. Prevents double booking.                                 |
| `booking_change_history`   | Audit trail of guest and admin booking changes.                                                                   |

## SMS operations

| Table                    | Purpose                                                                  |
| ------------------------ | ------------------------------------------------------------------------ |
| `sms_consents`           | Records whether a phone number opted in or opted out of SMS.             |
| `outbound_notifications` | Idempotency and delivery audit for automatic transactional SMS messages. |

`outbound_notifications` currently accepts SMS only. Future manager push,
email, and voice delivery should receive purpose-specific additive tables or a
separately reviewed general notification model.

## Future expansion map

| Feature          | Reuse                                                                | Add later                                                                              |
| ---------------- | -------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| Direct Instagram | Contacts, channel identities, conversations, messages, inquiry links | Meta subscription/account state and delivery metadata if required                      |
| Email            | Contacts, channel identities, inquiry links                          | Email templates and provider delivery/bounce records                                   |
| Voice calls      | Contacts, channel identities, messages                               | Call sessions, consent, provider state, timing, and transcript linkage                 |
| Manager app/PWA  | Venues and Supabase Auth                                             | Staff memberships, roles, device push subscriptions, preferences, notification history |

## Safe management rules

- Do not manually delete paid `table_bookings`, their leads, or financial history.
- Do not edit normalized phone numbers directly; use the application workflow.
- Apply schema changes through a new migration, never by renaming tables ad hoc.
- Add descriptions in Supabase with `COMMENT ON TABLE` when more clarity is needed.
- Archive old operational data later with an explicit retention policy rather than
  deleting records casually.
