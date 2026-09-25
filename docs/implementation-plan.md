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
- [x] Replace the monolithic behavior context with the client-approved Vera v2 compact core, deterministic scenario routing, structured v2 facts, and regression tests (2026-09-16).
- [x] Add controlled Canadian/Toronto nightlife-slang interpretation, respectful tone matching, and a non-escalating fallback for harmless slang (2026-09-18).
- [x] Expand the curated Toronto-slang interpretation guide and deterministically protect private employee schedules, presence, and contact information (2026-09-18).
- [x] Redirect nearby hotel, restaurant, bar, and competing-venue requests to the on-site team without advertising external businesses or forcing a booking (2026-09-18).

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
- [x] Verify the live schema produced by `202609030001_client_dashboard_expansion.sql` in the target Supabase project.
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
- [x] Verify the live 30-table inventory produced by `202609040002_expand_table_map.sql` in Supabase.
- [x] Add a private post-payment booking-management link for guest detail updates and cancellation.
- [x] Add a provisional 48-hour refund policy with automatic Stripe refund and table release.
- [x] Verify the live booking self-service columns produced by `202609040003_booking_self_service.sql` in Supabase.
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
- [x] Verify the live booking-change schema and RPC produced by `202609070001_booking_changes_and_email.sql` in Supabase.
- [ ] Configure and verify the Resend sender domain and email environment variables in Vercel.

## Direct multichannel messaging (2026-09-12)

Detailed architecture, message triggers, schema evolution, security rules, and acceptance
gates are recorded in `docs/twilio-messaging-plan.md` so implementation can proceed without
rereading the full project prompt.

- [x] Decide on direct Next.js/Vercel integration and retain n8n exports as fallback.
- [x] Define transactional SMS templates versus token-billed conversational AI.
- [x] Define shared SMS/Instagram conversation architecture and database changes.
- [x] Implement the Twilio adapter, code-owned templates, and transactional SMS hooks.
- [x] Implement signed inbound SMS, delivery callbacks, consent, and human handoff.
- [x] Add SMS/Instagram inbox filters and direct staff SMS replies.
- [x] Verify the live schema produced by `202609120001_twilio_messaging.sql` and successful Twilio delivery.
- [x] Show every linked SMS and Instagram thread as channel tabs inside inquiry details.
- [x] Connect the shared AI concierge to inbound SMS with bounded conversation history.
- [x] Keep normalized phone numbers as SMS identity and surface linked inquiries in the admin conversation view.
- [x] Separate staff-attention flags from explicit automation pause/resume controls.
- [x] Keep staff replies from disabling the concierge and retry automation after safe technical fallbacks.
- [x] Remove proactive AI terminology from guest-facing chat branding while retaining truthful internal attribution.
- [ ] Complete live inbound, AI reply, handoff, and admin-reply acceptance tests.
- [ ] Add the direct Meta channel adapter after the client receives Meta access.
- [x] Keep automatic SMS replies enabled by default with an explicit admin pause control.
- [x] Include a secure self-service URL in both table-booking and non-table inquiry SMS messages.
- [x] Add route loading feedback and consistent pressed/disabled interaction states.
- [x] Make admin inquiry/follow-up data loading resilient to transient and legacy-relation query failures.
- [x] Compact revenue editing to five records per page and keep long transcripts inside a dedicated chat scroller.
- [x] Improve guest-facing SMS tone and deterministically escalate direct staff, urgent, safety, complaint, and refund requests.
- [x] Document the production Supabase tables and safe database-management rules.
- [x] Complete a read-only live database audit covering schema presence, aggregate consistency, anonymous exposure, and application-query compatibility.
- [ ] Establish a staging Supabase project, recoverable backup procedure, and recorded migration ledger before the next schema expansion.
- [ ] Backfill legacy Instagram/web-preview identities into `contact_channels` before direct multichannel expansion.

## Manager mobile companion app (2026-09-14)

- [x] Create a separate Expo/React Native manager application with the Promotr visual system.
- [x] Add SMS and Instagram conversation sections, follow-ups, conversation detail, and SMS staff replies.
- [x] Add bearer-authenticated, venue-scoped mobile conversation API routes.
- [x] Add an additive migration for staff memberships and manager device registrations.
- [x] Apply `202609140001_manager_mobile_app.sql` to production (user-reported SQL Editor success; backup not confirmed).
- [x] Configure the mobile Supabase/API public environment values and complete user-verified live login, conversation read, SMS reply, Twilio receipt, and dashboard persistence tests.
- [x] Connect Expo device registration to inbound-message and follow-up push delivery.
- [ ] Create the EAS project/development build and complete a physical-device push notification test.

## Vera conversation intelligence (2026-09-16)

- [x] Add a client-approved basic bottle-service menu scenario without invented brands or individual bottle prices.
- [x] Make booking-form sharing explicitly guest-driven and suppress recent duplicate links.
- [x] Add visible message timestamps to web inquiry/conversation views and the manager mobile conversation.
- [x] Store original-language content with English translation metadata for inbound SMS and concierge replies.
- [x] Translate English staff replies into the guest's remembered language from both web and mobile.
- [x] Add structured contact memory and compact rolling conversation summaries without a vector database.
- [x] Add per-conversation SMS follow-up timing, interval, attempt limit, message, and on/off dashboard controls.
- [x] Add a secured follow-up processor designed for Supabase Cron instead of frequent Vercel Hobby cron.
- [x] Add a controlled general-nightlife fallback for unlisted questions, with clear venue-fact boundaries and unrelated-topic redirection.
- [ ] Apply `202609160002_conversation_intelligence_followups.sql` in staging/production and complete live multilingual and scheduled follow-up acceptance tests.

## Conversation ordering and realtime manager UX (2026-09-16)

- [x] Add a database-backed per-conversation SMS processing claim so concurrent Vercel invocations cannot generate replies for the same message batch.
- [x] Add a three-second quiet window that combines rapid consecutive guest texts into one concierge turn and suppresses stale generated replies when a newer text arrives.
- [x] Preserve original-language content in storage while showing the available English/admin-original text only in web and mobile manager interfaces.
- [x] Add authenticated Supabase Realtime subscriptions with a low-frequency refresh fallback in the web dashboard and manager app.
- [x] Add durable per-manager read cursors and unread counts for conversation lists.
- [x] Pass web lint, TypeScript, 45 unit tests, production build, mobile TypeScript, and Android export verification.
- [ ] Apply `202609160003_sms_queue_realtime_reads.sql` to production before deploying these source changes.
- [ ] Complete live acceptance with three rapid inbound SMS messages, a non-English exchange, two signed-in manager clients, background push, and foreground realtime updates.

## Lost and found operations (2026-09-16)

- [x] Add a public lost-item report with required guest contact details, item description, date, optional time, and last known location.
- [x] Add separate guest-report and venue-found-inventory records with safe status-based retention.
- [x] Add a compact admin Lost & Found tab for inventory entry, report review, and status management.
- [x] Route lost-item conversations to the dedicated playbook and append the report form without repeatedly sharing it.
- [x] Supply only safe, available found-item details to the concierge on relevant turns; exclude internal notes and guest records.
- [ ] Apply `202609160004_lost_and_found.sql` in staging/production before deploying the feature.
- [ ] Complete a live SMS-to-form-to-dashboard test and verify a plausible inventory match never exposes private or internal details.

## Compact admin workspace (2026-09-16)

- [x] Reduce shared desktop header, page-heading, and content spacing without changing admin behavior.
- [x] Move conversation channel controls and live status into the heading row so the inbox begins above the fold.
- [x] Consolidate inquiry search and status filters into one responsive desktop control row.
- [x] Compact overview metrics, follow-up cards, revenue summaries and rows, table controls, and Lost & Found panels.
- [x] Keep tablet navigation horizontally scrollable instead of squeezing the full desktop navigation into the header.
- [ ] Complete signed-in desktop visual acceptance at common laptop and large-desktop viewport sizes.

## Promotr Manager iOS distribution (2026-09-20)

- [x] Confirm that the client's Apple Developer Program membership is Individual and document why invited Admin access cannot create Apple signing resources.
- [x] Record the fixed Bundle ID, EAS identity, roles, signing, APNs, TestFlight, and App Store continuation steps in `docs/apple-ios-release-checklist.md`.
- [ ] Client: register the business as a legal entity, obtain/confirm its D-U-N-S Number, and complete Apple's Organization-membership conversion.
- [ ] Client: accept any updated agreement and confirm the Organization membership from Membership details.
- [ ] Restore Admin access to Certificates, Identifiers & Profiles and verify the correct Apple team.
- [ ] Register or reuse the explicit `com.promotr.manager` App ID with Push Notifications and create/reuse the matching App Store Connect record.
- [ ] Configure EAS iOS distribution, provisioning, APNs, and submission credentials without committing secrets.
- [ ] Build and submit the production iOS binary, then complete real-device TestFlight acceptance.
- [ ] Complete App Store metadata, privacy disclosures, review access, App Review, and client-controlled release.

## Instagram shared concierge rollout (2026-09-21)

See `docs/instagram-integration-plan.md` for the architecture and activation checklist.

- [x] Implement a single handoff-only n8n Instagram workflow and reuse the application-side Vera prompt/scenario engine.
- [x] Implement direct Instagram Send API delivery, inbound conversation persistence, rapid-message claim, translations, memory, handoff, and manager notifications.
- [x] Enable web and mobile API staff replies; leave automatic replies on by default and expose explicit pause/resume.
- [ ] Apply the prerequisite queue migration and new Instagram migration to the target Supabase database after backup and migration-ledger review.
- [ ] Deploy the application, re-import/activate the new n8n workflow, and configure Meta/Vercel credentials for the client-owned Instagram account.
- [ ] Complete real inbound/outbound, concurrency, multilingual, handoff, staff-reply, and notification acceptance tests; do not describe the channel as live before these pass.
- [x] Verify the webhook signature against the original request bytes and cover non-text-safe payloads in a route test.
- [x] Resolve the production Meta Test `signature_mismatch` (POST 401): production authenticated a signed Meta request with `secretSource: "instagram"` on 2026-09-21. The request contained no supported text event and did not run n8n.
- [ ] Resolve missing webhook delivery for real Instagram DMs. A 9:20 PM Sri Lanka time DM from `veloxdy` is visible in Instagram, but there was no Vercel webhook request or Supabase webhook-event row; the configured account token also returns zero accessible conversations. Account `subscribed_apps` reports `messages`. The client verified by screenshot that Promotr's Instagram "Allow access to messages" setting is already on. A fresh Meta dashboard screenshot shows both `veloxdy` and `promotr.nightclub` Webhook Subscription switches On and the `messages` field subscribed. The developer confirmed that `veloxdy` appears as an Instagram Tester in app roles. The Meta Publish page explicitly labels the app Unpublished and requires a privacy policy URL plus use-case review. Do not mark the Instagram channel live until publication requirements are met and one real inbound message is persisted and replied to.
- [x] Add public privacy and data-deletion instruction pages using the supplied Promotr Night Club contact and link the privacy notice from public forms.
- [ ] Obtain owner review of the privacy/deletion drafts, confirm operational retention and deletion practices, deploy the pages, then set the real public URLs in Meta App Settings. See `docs/meta-privacy-publication.md`.
- [x] Add explicit same-app Instagram/Meta signing-key support, fail-closed tests, and safe authentication/filter/forward logs.
- [x] Make explicit guest booking-link requests deterministic in the shared Vera engine, independent of the model's `shareBookingForm` flag; preserve non-pushy behavior and recent-link suppression for general booking intent. Add SMS/Instagram-shared regression tests.
- [ ] After deployment, confirm a real Instagram guest asking for the booking link receives the form, while a venue FAQ does not receive an unsolicited form.
- [x] Keep SMS and Instagram on the same Vera v8 engine; supply an authoritative Toronto-local calendar, give deterministic direct-date and simple tomorrow-booking answers without claiming live availability, preserve prior summaries through deterministic/fallback replies, and look up bounded older messages for explicit recall questions within the same verified contact.
- [ ] Verify the Vera v8 date, memory, and off-topic behavior with real SMS and Instagram conversations after deployment; inspect the live deployment commit and stored summaries rather than inferring success from unit tests.
- [ ] Design an opt-in, verified SMS-to-Instagram contact-linking flow before sharing a guest's memory across those identities. Do not merge by display name, unverified phone number, or booking-form text.
- [ ] Audit and acceptance-test every relevant scenario in `Vera — The Promotr Lounge AI Concierge Master Prompt.pdf` against the current modular playbooks and later client decisions. The PDF is not injected verbatim, and local tests do not prove full live behavior.
- [x] Restructure Vera v9 into one permanent master prompt and 24 separate scenario modules covering all 42 numbered PDF sections plus later staff-privacy, nearby-place, slang, and general-fallback decisions. Route by current intent, use older context only for short follow-ups, cap assembly at three playbooks, and document the source mapping in `docs/vera-prompt-architecture.md`.
- [x] Tighten Vera v10 scope after an Instagram geography-chat report: remove permission to answer unrelated facts, add a dedicated off-topic playbook, and test the reported two-turn exchange locally. The PDF emphasizes nightlife-related questions; the explicit off-topic boundary is the client's later direction.
- [ ] Deploy Vera v10 and verify a real Instagram off-topic exchange redirects briefly without answering trivia; also verify normal Promotr and nightlife questions still receive useful answers.
- [ ] Run model-level and live SMS/Instagram acceptance conversations for every scenario family; unit routing tests alone do not certify client-ready behavior.
- [x] Run live diagnostic reads: the local Instagram token identifies the configured Promotr account and its account-level subscription includes `messages`; production internal authentication accepts the local n8n shared secret. The local Meta signing secret is rejected by production. The active domain points to the current commit; Vercel marks Meta credentials sensitive, so their deployed values cannot be read back.

## Owner-meeting dashboard improvements (2026-09-22)

See `docs/client-demo-improvements-plan.md` for the client's seven requested changes, assumptions, acceptance criteria, and gated outreach design.

- [x] Correct raw staff-translation response parsing; add unit tests.
- [x] Add main inbox send feedback and pending state; show translation and provider failures without crashing the form.
- [x] Fetch the newest 200 messages, start the main transcript at the latest message, and provide a jump-to-latest control.
- [x] Remove redundant conversation-action refresh calls, parallelize independent inbox reads, add pause/resume pending feedback, reduce fallback full-page polling, and prevent scheduled SMS follow-ups from running while staff has paused automation.
- [x] Add an Open/Needs review/All side-panel filter and accurate status cards for AI Initiate (unavailable), AI Respond, and SMS-only AI Follow Up.
- [x] Display English alongside original/delivered text in the main transcript when translated.
- [x] Keep the Conversations workspace within the viewport, independently scroll the conversation list/transcript/guest details, and move existing automation controls into the details panel so the message composer remains visible. No messaging actions or data logic changed.
- [ ] Complete signed-in desktop/mobile visual QA and real provider-send/translation/timing acceptance; the browser connection was unavailable in this workspace session.
- [ ] Confirm the “Open” reference and full-size redesign image with the client.
- [ ] Specify, build, and separately approve consent-aware AI initiation, tags, and SMS broadcasts; do not activate open-ended outreach or cold Instagram DMs.

## Owner-meeting navigation views (2026-09-22)

- [x] Add Settings as a protected hub for existing controls and public links, without exposing secrets or adding pretend configuration switches.
- [x] Add date-filtered Guest List and Reservations views backed by existing venue-scoped leads and table-booking records. A guest-list request is not confirmed until its inquiry is Booked; held, cancelled, expired, and refunded table bookings are not displayed as reservations.
- [ ] Verify these new views with real signed-in data at desktop and mobile sizes, including a cancelled/refunded table booking and an unconfirmed guest-list request, before the client demo.

## Admin navigation performance (2026-09-22)

- [x] Keep live user and membership authorization, but use verified claims in the SSR session-refresh proxy to avoid an extra Auth-server user lookup when local JWT verification is available.
- [x] Start loading a requested chat's messages alongside the conversation list, using the result only when that chat belongs to the active list page.
- [x] Log slow admin session refreshes, authorization checks, and conversation database requests with durations only; exclude guest content, query parameters, and credentials.
- [x] Pass typecheck, lint, 127 tests with two Vitest workers, and a production build. The initial unrestricted test run hit local worker-start timeouts, not assertion failures.
- [x] Record a public production baseline from this workspace: homepage first-byte times 2.03s, then 0.58/0.55/0.55s; unauthenticated admin-login first-byte times 1.71/0.60/0.55s. These are small-sample network observations, not signed-in admin or browser-render measurements.
- [ ] Deploy and measure signed-in production navigation: compare browser request wait time with `Slow admin session refresh`, `Slow admin authorization`, and `Slow admin database request` logs for a sidebar click and a chat switch. Local verification does not establish a production speed improvement.
- [ ] Use the measured bottleneck to decide whether to split chat-detail loading from the list, reduce exact counts, optimize query plans, or align hosting/database regions. Preserve messaging behavior and authorization.
- [x] Production logs from 2026-09-22 show admin authorization taking 1,087–1,904 ms on sampled page loads and slow conversation requests including `mark_manager_conversation_read`; a conversations-list request took 705 ms. These are server logs, not a complete browser navigation profile.
- [x] Stop blocking conversation rendering on the read-cursor RPC; schedule it after the response only when the selected conversation has unread messages. Keep the same authenticated membership/venue check in the RPC and continue showing the selected conversation as read in the UI.
- [x] Split slow authorization logs into user verification, membership lookup, and membership provisioning durations, without logging identity or credentials.
- [ ] After deployment, inspect the new authorization phase timings and compare chat-switch latency. If live user verification is the dominant cost, investigate Auth/Vercel regional latency before changing security semantics.
- [x] Production phase timings confirmed the repeated membership lookup as the dominant general-navigation authorization cost: sampled lookups took 608–2,239 ms while user verification took 206–462 ms.
- [x] Move staff-membership provisioning out of every protected page/action request and perform it once after a successful admin sign-in. Keep the live user/email authorization check on every protected request.
- [x] Add `202609230001_admin_conversation_performance.sql`, using a partial inbound-message index and a correlated unread-count query so outbound history is not scanned for unread badges.
- [ ] Apply the new performance migration to production, deploy the application changes, then verify sidebar navigation, conversation switching, unread badges, and read-state persistence with real signed-in data.

## Staff-managed venue information (2026-09-25)

- [x] Add a protected Settings editor for confirmed hours, events, menu changes, prices, policies, and general venue notices.
- [x] Store published updates inside the existing structured venue facts without exposing or editing Vera's protected system instructions.
- [x] Supply the newest published information to the shared SMS and Instagram Vera engine; newer operational facts override older playbook facts while safety and privacy rules remain authoritative.
- [ ] Deploy and verify that a newly published venue update changes a real SMS and Instagram answer, then clear the test update.
- [x] Upgrade the editor to individual Venue Knowledge items with categories, drafts, publishing, editing, deactivation, Toronto start/end scheduling, automatic expiry, and retained history inside the existing venue facts record.
- [x] Inject only currently active knowledge items into the shared Vera engine; inactive, draft, scheduled, and expired items are not provided to the model.
- [ ] Verify the Venue Knowledge manager visually in dark/light mode and test create, edit, schedule, publish, deactivate, automatic expiry, SMS, and Instagram in production.

## Gmail conversations (2026-09-25)

- [x] Add encrypted Google OAuth connection and disconnection controls for the dedicated Promotr Gmail mailbox.
- [x] Add incremental Inbox synchronization, provider-message deduplication, contact/lead linking, quoted-history cleanup, and automatic-message loop protection.
- [x] Use the shared Vera prompt, contact memory, venue knowledge, booking/lost-item links, handoff rules, automation pause, and staff replies for email conversations.
- [x] Display email in the manager web inbox, inquiry conversation view, follow-up view, and manager mobile API.
- [x] Add secured Supabase Cron polling plus optional authenticated Gmail Pub/Sub push and watch renewal.
- [ ] Apply the Gmail migration, configure Google/Vercel values, authorize `matt.promotr@gmail.com`, and configure the sync schedule.
- [ ] Verify a real inbound email, Vera reply in the original Gmail thread, staff reply, pause/resume, handoff, memory recall, and mobile visibility after deployment.
