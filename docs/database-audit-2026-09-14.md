# Production database audit — 2026-09-14

## Scope and safety

This audit compared the repository migrations and application queries with the
live Supabase REST schema. It also ran aggregate-only consistency and access
checks. It did not rename tables, alter schema, update rows, delete data, invoke
mutating database functions, or expose guest/payment/message content.

## Result

The live database is compatible with the current application. All 14 expected
tables, their currently required columns, and all nine expected RPC functions
are present. No urgent schema repair is required.

### Verified live structure

- Core: `venues`, `contacts`, `conversations`, `messages`, `leads`,
  `lead_submission_attempts`, and `webhook_events`.
- Tables/payments: `club_tables`, `table_bookings`, and
  `booking_change_history`.
- Multichannel/SMS: `contact_channels`, `lead_conversations`, `sms_consents`,
  and `outbound_notifications`.
- Booking self-service columns, cancellation/refund columns, booking-change
  columns, and management-email tracking are present.
- Database functions are present for inquiry submission, table holds, payment
  confirmation, rescheduling, web-preview conversations, and Instagram workflow
  persistence.

### Aggregate snapshot

These counts are operational context, not fixtures to enforce:

| Area                        | Verified result                                         |
| --------------------------- | ------------------------------------------------------- |
| Venue                       | 1                                                       |
| Club tables                 | 30 active; all have map coordinates; no duplicate codes |
| Booking inquiries           | 30                                                      |
| Table bookings              | 9 confirmed, 7 expired, 1 cancelled                     |
| Active table/date conflicts | 0                                                       |
| Conversations               | 12: 4 SMS, 4 web preview, 4 Instagram                   |
| Conversation state          | 9 open, 3 need follow-up, 1 explicitly paused           |
| Messages                    | 95                                                      |
| Booking change history      | 2                                                       |
| SMS consent                 | 2 opted in, 0 opted out at audit time                   |
| Outbound notifications      | 5 delivered, 5 failed historical records                |
| Meta webhook events         | 0                                                       |

The failed notification records match earlier Twilio delivery/configuration
testing and should remain as audit history. The Instagram conversations are not
evidence of live Meta traffic because no Meta webhook event has been stored.

## Security checks

- Anonymous access returned zero visible rows for all 14 application tables.
- Anonymous execution of the private web-conversation RPC was denied.
- Admin pages/actions verify the authenticated email before using the server-only
  service-role client.
- Stripe and Twilio webhook endpoints validate provider signatures before using
  privileged database access.
- Payment records store Stripe identifiers and amounts; card details are not
  stored in these application tables.

## Findings and decisions

### 1. Keep current names

Do not rename live tables. Names are already referenced by Next.js routes,
database functions, foreign keys, Stripe/Twilio processing, and historical
migrations. The database guide supplies the human-readable meaning.

### 2. Record a migration baseline

The live schema proves that the migration outcomes exist, but it does not prove
which SQL files were executed manually or preserve a checksum history. Before
the next schema feature, capture a Supabase backup and establish a migration
deployment log containing filename, environment, date, operator, and result.

### 3. Backfill channel identities before direct Meta/email expansion

There are 12 contacts in total and 4 rows in `contact_channels`. Current SMS works,
but future channel work should first add an idempotent, previewable backfill for
legacy Instagram and web-preview identities. `contact_channels` should become
the canonical provider identity map; the existing `contacts.instagram_scoped_id`
column remains as a compatibility field until a separately tested migration can
retire it.

### 4. Add manager access as a separate feature

The current application supports one configured administrator email. A manager
app/PWA requires dedicated staff membership, roles, venue access, notification
preferences, and device push subscriptions. Those should be new tables linked to
`venues` and Supabase Auth, without changing booking/payment tables.

### 5. Extend channels through additive migrations

- Instagram can reuse `contacts`, `contact_channels`, `conversations`,
  `messages`, and `lead_conversations`.
- Email should add delivery/provider tracking and templates while continuing to
  link the guest through `contact_channels`.
- Voice should add a `call_sessions` table for provider call ID, state, timing,
  consent, and transcript linkage; normalized transcript messages can still use
  `messages`.
- Manager push notifications should use staff/device/notification tables rather
  than `outbound_notifications`, which currently enforces SMS-only delivery.

## Safe next sequence

1. Export and verify a recoverable Supabase backup before any new migration.
2. Create a staging Supabase project and apply all repository migrations in
   timestamp order.
3. Compare staging with this production baseline.
4. Prepare the channel-identity backfill with a dry-run report and idempotency.
5. Test booking, Stripe, revenue, SMS, conversations, follow-ups, admin access,
   table availability, rescheduling, cancellation, and refunds in staging.
6. Apply one reviewed additive migration at a time to production.
7. Repeat the live workflow checks and record the migration result.

No production database mutation is recommended from this audit alone.
