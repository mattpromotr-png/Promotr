# Database migration ledger

Record every future staging and production schema change here. Never place
database passwords, service-role keys, or customer data in this file.

| Migration                                            | Environment | Applied at       | Applied by             | Backup verified | Result                        | Workflow verification                                                                                                                   | Notes                                                         |
| ---------------------------------------------------- | ----------- | ---------------- | ---------------------- | --------------- | ----------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| Baseline through `202609120001_twilio_messaging.sql` | Production  | 2026-09-14 audit | Read-only verification | Pending         | Live schema outcomes verified | Existing booking, payment, SMS, conversation, and admin operations reported working; full regression required before next schema change | Exact historical manual execution dates/checksums are unknown |

## Required verification for each production migration

- Confirm a recoverable backup or point-in-time recovery window.
- Apply and validate the migration in staging first.
- Record the SQL migration filename and reviewer.
- Verify admin login and inquiry loading.
- Verify booking submission and guest self-service editing.
- Verify table capacity, availability, hold expiry, and double-booking prevention.
- Verify Stripe test checkout, payment reconciliation, revenue, cancellation,
  and refund behavior when the migration touches bookings or payments.
- Verify SMS receipt, delivery status, replies, follow-ups, and staff replies when
  the migration touches contacts or conversations.
- Record the result and any rollback/recovery action.
