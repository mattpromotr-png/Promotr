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
- [ ] Unit tests plus successful Playwright path.

Acceptance: form validation and persistence; authenticated lead visibility; client bundles contain no secrets.

## Gate 4 — webhook boundary

- [x] Meta GET challenge verification.
- [x] POST signature validation, supported-event filtering, echo rejection, normalization, and provider-ID deduplication.
- [x] Secure n8n handoff with timeout/error handling.
- [ ] Add route-level fixture test covering repeated delivery and failed-forward retry.

Acceptance: verification succeeds; valid inbound text is processed once.

## Gate 5 — AI and conversation rules

- [x] Versioned behavior prompt and separate structured venue facts.
- [ ] OpenAI/n8n adapter and validated structured response contract (contract complete; orchestration pending).
- [ ] Bounded context, missing-field logic, deterministic booking-link append, handoff rules, safe fallback, and usage/latency metadata.
- [ ] Tests for FAQs, non-confirmation, missing questions, URL sharing, complaints, unknowns, and parsing failure.

Acceptance: accurate concise replies, no false confirmations, correct next action, safe handoff.

## Gate 6 — n8n and integration

- [ ] Importable secret-free workflow implementing load/classify/respond/send/store/retry steps.
- [ ] Credential/environment mapping and current official Meta configuration instructions.
- [ ] Fixture mode remains usable if external credentials are unavailable.

## Gate 7 — verification and handoff

- [ ] Formatting, lint, strict typecheck, unit tests, Playwright, production build.
- [ ] Secret and accidental-PII scan.
- [ ] README, demo script, deployment steps, limitations, owner actions, and deferred backlog.
- [ ] Re-check the original contract once against all 12 acceptance criteria, then stop.

## Current status

Gates 1 and 2 are complete. Gate 3 is implemented except its Playwright path. Gate 4 has its production boundary and unit fixtures; route-level deduplication coverage remains. Gate 5 has the versioned prompt and response contract, with orchestration still pending. No local implementation blocker. Live credentials remain intentionally deferred.
