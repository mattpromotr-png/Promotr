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
- [ ] Apply and verify `202609040001_table_deposits.sql` in Supabase.
- [ ] Configure Stripe test keys and webhook, then complete a test-mode payment round trip.
- [ ] Replace demo table positions and prices when the client provides the real floor plan and commercial rules.
