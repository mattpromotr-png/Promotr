# Implementation plan

The client contract is mapped into small verified gates. Update this file after each gate so another session can resume without rereading the full specification.

## Gate 1 — discovery and compact context

- [x] Inspect repository and both supplied images.
- [x] Confirm no pre-existing application code or conflicts.
- [x] Record scope, architecture, UI system, assumptions, and external blockers.

## Gate 2 — scaffold and foundations

- [x] Next.js App Router, strict TypeScript, Tailwind, lint/format scripts.
- [x] Theme support, base design tokens, reusable field/button/card primitives.
- [x] Shared environment validation and `.env.example`.
- [x] Vitest and Playwright configuration.

## Gate 3 — data, booking UI, and admin

- [x] Supabase migration, RLS policies, and sanitized demo venue seed.
- [x] Shared booking schema with future-date, contact, bounds, consent, and conditional bottle validation.
- [x] Booking form, honeypot, accessible errors, rate limiting, submission idempotency, and non-confirming success page.
- [x] Supabase Auth login boundary and minimal newest-first lead view with status filter/update and handoff marker.
- [x] Unit tests plus successful Playwright path.

Acceptance: form validation and persistence; authenticated lead visibility; client bundles contain no secrets.

## Gate 4 — webhook boundary

- [x] Meta GET challenge verification.
- [x] POST signature validation, supported-event filtering, echo rejection, normalization, and provider-ID deduplication.
- [x] Secure n8n handoff with timeout/error handling.
- [x] Add route-level fixture test covering repeated delivery; failed-forward retry remains implemented and is covered by the same persisted state contract.

Acceptance: verification succeeds; valid inbound text is processed once.

## Gate 5 — AI and conversation rules

- [x] Versioned behavior prompt and separate structured venue facts.
- [x] OpenAI/n8n adapter and validated structured response contract.
- [x] Bounded context, deterministic booking-link append, complaint/sensitive handoff rules, safe fallback, and usage metadata.
- [x] Expand fixtures for every venue FAQ and multi-turn missing-field scenario.

Acceptance: accurate concise replies, no false confirmations, correct next action, safe handoff.

## Gate 6 — n8n and integration

- [x] Importable secret-free workflow implementing load/classify/respond/send/store/retry steps.
- [x] Credential/environment mapping and current official Meta configuration instructions.
- [x] Fixture mode remains usable if external credentials are unavailable.
- [x] Separate mock-Meta workflow verifies outbound persistence and admin handoff before Meta access; it is explicitly excluded from production.

## Gate 7 — verification and handoff

- [x] Formatting, lint, strict typecheck, unit tests, Playwright, production build.
- [x] Secret scan (no credential-pattern matches); repeat with final live configuration excluded from git.
- [x] README, demo script, deployment steps, limitations, owner actions, and deferred backlog.
- [x] Re-check the original contract once against all 12 acceptance criteria and record fixture/live status.

## Current status

All non-live gates are complete and mapped in `docs/acceptance-status.md`. The repository is ready for final verification after the latest admin/venue-fact changes. Live integration is blocked only by owner-controlled Supabase, n8n, OpenAI, Meta, and Vercel accounts/credentials; enter secrets directly in those platforms, never in chat or git.

## Post-MVP admin usability

- [x] Add a responsive admin navigation shell and real-data overview dashboard.
- [x] Replace unbounded inquiry cards with search, status counts, 20-row pagination, and responsive table/cards.
- [x] Add a detailed inquiry dialog with contact, booking, preferences, notes, handoff reason, and status action.
- [x] Move AI-requested human follow-ups to a dedicated paginated page with a resolve action.
- [x] Add database indexes for admin status, requested-date, and follow-up queries.

## Client dashboard expansion (2026-09-03)

- [x] Public Promotr landing page with booking and admin entry points.
- [x] Rename inquiry stages to New, Contacted, Pending, and Booked.
- [x] Add web-preview conversation persistence, staff takeover, dashboard inbox, and inquiry-level chat.
- [x] Add staff-entered confirmed bottle-service revenue with daily, weekly, monthly, and total views.
- [ ] Apply and verify `202609030001_client_dashboard_expansion.sql` in the target Supabase project.
- [ ] Connect Instagram delivery after Meta messaging access is approved.
- [ ] Later phase: choose and integrate a deposit provider such as Stripe after payment rules are approved.
- [ ] Later phase: design the club table map after receiving the floor plan, table inventory, capacities, and booking rules.

## Table deposits and floor map (2026-09-04)

- [x] Define configurable demo table inventory, capacity, minimum-spend, deposit, refund, and 30-minute hold rules.
- [x] Add atomic database-backed table holds and active-booking conflict prevention.
- [x] Add two-step booking flow with visual table selection and deposit review.
- [x] Add Stripe-hosted Checkout creation and signed webhook payment confirmation.
- [x] Add payment success/cancellation pages, admin table map, and verified-deposit revenue totals.
- [x] Apply and verify `202609040001_table_deposits.sql` in Supabase.
- [x] Configure Stripe test keys and webhook, then complete a test-mode payment round trip.
- [x] Expand the provisional floor plan to 30 interactive tables with guest and admin views.
- [ ] Apply and verify `202609040002_expand_table_map.sql` in Supabase.
- [x] Add a private post-payment booking-management link for guest detail updates and cancellation.
- [x] Add a provisional 48-hour refund policy with automatic Stripe refund and table release.
- [ ] Apply and verify `202609040003_booking_self_service.sql` in Supabase.
- [ ] Replace provisional table positions and prices when the client provides the real floor plan and commercial rules.

## Reliability and multilingual replies (2026-09-05)

- [x] Update the browser acceptance test for the two-step booking flow on desktop and mobile.
- [x] Remove React effect and navigation lint violations from the inquiry and booking interfaces.
- [x] Require same-language guest replies while preserving venue facts, structured JSON, and all safety/handoff rules.
- [x] Apply the language behavior consistently to the web preview, production n8n workflow export, and mock workflow export.
- [x] Add multilingual contract fixtures for French, Spanish, German, and Portuguese replies.
- [ ] Re-import or manually update the active n8n workflow so the deployed workflow receives the new multilingual prompt.
- [ ] Run live model conversations in the target languages and review naturalness, fact accuracy, and handoff behavior.
- [x] Link web-preview booking submissions to their originating conversation.
- [x] Show up to 100 messages in inquiry details and add direct navigation to the full conversation.
- [x] Store English translations for new web-preview messages and display them beneath the original text for staff.
- [x] Translate English staff replies into the web guest's detected language while preserving the staff original.
- [x] Add the conversation identifier to booking links produced by the production n8n workflow export.
- [ ] Extend the live Instagram workflow metadata and staff-send path after Meta credentials are available.
- [x] Show guest booking actions only when relevant, return successful edits to the public site, and provide a clear cancellation completion state.
- [x] Hide unchanged inquiry-status and revenue save actions until their values are edited.
- [x] Add a detailed Stripe deposit ledger while keeping refunded payments out of received-deposit totals.
- [x] Load inquiry messages on demand instead of loading every message with the inquiry list.
- [x] Share the booking form immediately for explicit English or Sinhala link requests and improve conversational Sinhala guidance.
- [ ] Configure `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in the preview app locally and on Vercel so preview chats persist and can link to inquiries.

## Final experience review (2026-09-07)

- [x] Tighten the landing hero spacing and prevent the gradient headline descender from clipping.
- [x] Make the shared Promotr brand link back to the public homepage.
- [x] Add explicit homepage navigation to the booking form and admin login.
- [x] Expand the public footer with useful venue details, section links, booking action, and responsible-entry information.
- [ ] Complete final desktop and mobile visual acceptance in a connected browser before client handover.
- [x] Keep inquiry and follow-up lists at 20 records per page and add pagination to deposit transactions and conversations.
- [x] Allow admins to edit inquiry details inside the existing detail dialog.
- [x] Add confirmed inquiry deletion while retaining Stripe-paid records for financial integrity.
- [x] Add atomic table/date/party rescheduling with capacity, availability, and guest 48-hour checks.
- [x] Surface guest booking updates in the newest-first admin list with a review acknowledgement.
- [x] Add admin booking overrides with an audit trail while preserving the actual Stripe deposit amount.
- [x] Add Resend transactional management-link email delivery after verified Stripe payment.
- [ ] Apply and verify `202609070001_booking_changes_and_email.sql` in Supabase.
- [ ] Configure and verify the Resend sender domain and email environment variables in Vercel.

## Direct multichannel messaging (2026-09-12)

Detailed architecture, message triggers, schema evolution, security rules, and acceptance
gates are recorded in `docs/twilio-messaging-plan.md` so implementation can proceed without
rereading the full project prompt.

- [x] Decide on direct Next.js/Vercel integration and retain n8n exports as fallback.
- [x] Define transactional SMS templates versus token-billed conversational AI.
- [x] Define shared SMS/Instagram conversation architecture and database changes.
- [ ] Implement foundation and transactional SMS notifications.
- [ ] Implement signed inbound SMS, delivery callbacks, consent, and human handoff.
- [ ] Add SMS/Instagram filters, linked inquiry threads, and direct staff SMS replies.
- [ ] Connect the shared AI concierge to inbound SMS and complete live acceptance.
- [ ] Add the direct Meta channel adapter after the client receives Meta access.
