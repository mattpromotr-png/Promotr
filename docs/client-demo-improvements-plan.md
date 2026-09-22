# Owner-meeting improvement plan (2026-09-22)

This plan interprets the client's September 20 list and the small dark-dashboard reference image. It is a plan, not a claim that the fixes or new features are deployed. The original image is too small to certify pixel-level layout; obtain the full-size reference before committing to exact spacing and controls.

## Local implementation status (2026-09-22)

- [x] Corrected staff-translation parsing for the raw Responses API `output[].content[]` format, with tests for English pass-through, translated output, and malformed output.
- [x] Added inline send success/error and pending feedback in the main Conversations tab; server failures no longer leave that form without a user-facing result. Actual provider delivery still needs a live test.
- [x] Changed the main and linked-inquiry conversation queries to fetch the newest 200 messages, render chronologically, and start the main transcript at the latest message. Added a jump-to-latest control when staff scroll upward.
- [x] Removed redundant `refresh()` calls from conversation mutations, parallelized independent inbox reads, showed pending state on AI Respond pause/resume, and reduced whole-page fallback polling from 15 to 60 seconds. The SMS follow-up scheduler now skips staff-paused conversations. Production timing still needs measurement.
- [x] Added an Open/Needs review/All filter to the conversation side panel and truthful AI Initiate, AI Respond, AI Follow Up status cards. AI Initiate remains unavailable; Follow Up remains SMS-only.
- [x] Showed English and original/delivered language in conversation bubbles when they differ.
- [ ] Verify the main dashboard visually at desktop and mobile widths. The in-app browser was unavailable in this environment.
- [ ] Reproduce the reported crash and confirm actual SMS, Instagram, and web-preview sends, translations, pause/resume persistence, and timing against production. The translation parser was a strong code-level suspect, not a confirmed cause of the client's crash.
- [ ] Confirm “Open” means the conversation-status filter and obtain a full-size redesign image before claiming design parity.
- [ ] Build/activate AI Initiate, AI-assisted tags, and SMS broadcasts only after the decisions and release gates below.

## Priorities before the owner meeting

### P0 — Make the existing demo reliable

1. **Fix staff-send failure in Conversations.** Reproduce separately for SMS, Instagram, and web preview with a test contact; capture the browser error and server log. Trace the server action through language selection, translation, provider send, database write, and refresh. Show a specific, non-sensitive inline error instead of crashing the page; prevent duplicate clicks; retain the draft on failure. Verify provider receipt and persisted message, not just a successful button press. Do not assume translation is the cause until logs identify it.
2. **Open at the latest message.** Fetch the newest 200 messages, render them oldest-to-newest, then scroll the transcript to the bottom on initial open and conversation change. Preserve the reader's scroll position when older history is loaded or live updates arrive; show a “New messages” control when the reader is above the bottom. The current ascending query with `limit(200)` returns the earliest 200, so scrolling alone is insufficient.
3. **Make pause/resume and sending feel responsive.** Measure page load, server-action, translation, provider, database, and full-refresh times. Add immediate pending feedback and disable repeat submits. Avoid full-page refresh for each toggle if a targeted state update is sufficient. Reduce expensive conversation-list queries and the 15-second whole-page polling work only after measuring where time is spent. Confirm persisted state after refresh; never show “paused” optimistically if the server rejected it.
4. **Verify two-way translation.** Test one non-English SMS and one non-English Instagram exchange end to end: keep original text, show its English translation to staff, let staff compose in English, deliver a checked translation to the guest, and show both versions and delivery status in the dashboard. Handle unknown language and translation failure visibly, without silently sending an unintended language.

**P0 acceptance:** no crash on a successful or failed send; no duplicate delivery; newest message visible when opening a long chat; pause state changes visibly and persists; staff and guest see the intended language; an actual phone/Instagram account receives the reply. Capture timing before and after.

### P1 — Present a clearer dashboard (F:\Promotr\docs\clients_suggessions\images\new admin dashboard idea.png)

- Use the reference's broad structure: a compact left navigation, conversation list and chat as the main workspace, and a contextual guest panel for tags, linked inquiry, recent activity, and automation status. Keep responsive mobile/tablet behavior and existing accessibility/contrast rules.
- Place “Open” prominently at the top of the relevant side panel. **Assumption:** the client means an _Open conversations_ filter/status; confirm with a larger image or a short description before locking this UI.
- Show three distinct automation controls with status and next action: **AI Initiate**, **AI Respond**, and **AI Follow Up**. Until the initiation policy and consent rules are approved, render AI Initiate as a clearly labeled preview/disabled control rather than an active mass-message switch.
- Do not let a cosmetic redesign obscure existing staff takeover, channel identity, delivery status, translation, consent, or opt-out information.

**P1 acceptance:** common owner tasks (find guest, read latest message, send, pause, inspect details) are obvious at desktop and mobile widths; the UI uses real persisted data, not fabricated demo counts.

## Automation design after the meeting

The client's proposed sequence is interpreted as a bounded state machine, not a loop that sends indefinitely:

`eligible + consented contact → AI Initiate (limited attempts until first reply) → AI Respond (inbound conversation) → AI Follow Up (bounded inactivity reminder) → stop / staff takeover / opt-out`

- **AI Initiate:** Assumption: for SMS contacts who have separately consented to this outreach, send a small, configurable sequence only until the first guest reply or a maximum attempt/time limit. No automatic outreach to imported numbers without documented consent. Instagram API messaging requires the recipient to have messaged the professional account first; do not design Instagram cold-DM initiation or broadcasts around the SMS flow.
- **AI Respond:** Existing inbound Vera behavior, controlled independently from initiation and follow-ups. Staff takeover, safety/handoff, and pause must suppress automatic replies.
- **AI Follow Up:** Existing SMS-only per-conversation scheduler is a starting point. Define the exact inactivity trigger, maximum attempts, quiet hours, expiry, cancellation on any guest reply, staff action, opt-out, or closed conversation. Do not simply relabel the current timer as a finished three-mode system.
- Define scope of each switch: venue-wide default versus per-conversation override, channel, and operator permissions. Every scheduled message needs an idempotent send record, audit trail, rate/cost cap, and visible stop reason.

## Tags and broadcasts — separate, gated feature

### Tags

- Store typed, editable tags with provenance: `manual`, `guest_stated`, or `verified_booking/payment`; include evidence message/event and confidence when AI-suggested. Let staff approve or remove suggestions.
- Start with operational tags such as birthday month, guest-list interest, repeat visitor, and table interest. A “VIP spender” tag must be based on verified transaction history or explicit staff assignment, not conversational speculation.
- Do not merge SMS and Instagram identities by display name. Segment only contacts whose channel identity and marketing permission are established.
- Give the owner tag search/filter and a preview of the exact audience before any campaign can send.

### Broadcast

- **SMS only in the first implementation proposal.** Build CSV/XLSX import preview, phone normalization, duplicate detection, validation, suppression/opt-out check, consent-source proof, approved template, audience snapshot, schedule, throttled queue, pause/cancel, per-recipient result, spend estimate/cap, and audit log.
- Keep transactional replies, AI initiation, AI response, follow-ups, and marketing broadcasts as distinct message purposes and consent states. A conversation, spreadsheet row, or tag alone is not consent for marketing.
- Do not activate broadcast sending before the owner approves messaging purpose, recipients, consent evidence, copy, unsubscribe text, and budget. Run a tiny opt-in test cohort before any broad send.
- Instagram bulk DM is **not** included in this design; Meta's official Send API requires the Instagram recipient to have messaged the professional account first. Any further Instagram outreach use case needs a separate current-policy review.

Canadian commercial SMS requires consent, sender identification, and unsubscribe; Twilio also requires consent records and prohibits unwanted bulk messaging. Sources: [CRTC CASL FAQ](https://crtc.gc.ca/eng/com500/faq500.htm), [Twilio Messaging Policy](https://www.twilio.com/en-us/legal/messaging-policy), [Meta Instagram Send API](https://www.postman.com/meta/instagram/folder/uxudqu0/send-api).

## Decisions to confirm with the client

1. Which channel(s) should each of the three AI switches control, and are they global or per guest?
2. What does “AI Initiate” mean exactly: first outreach after a booking/opt-in, or follow-up after a guest's initial DM? What maximum attempts and delay does he want? Never interpret “until response” as unlimited sends.
3. What does “Open” refer to in the side panel: conversation status, a navigation item, or an “open inquiry” filter? Request a larger screenshot if available.
4. Which languages should be demonstrated tomorrow, and does staff want both original and English visible in each bubble?
5. For future broadcasts, where did the spreadsheet recipients opt in to _Promotr marketing SMS_? Who approves campaign text, recipient list, budget, and send time?
6. Should tags be AI suggestions requiring review, or can some verified operational tags be applied automatically?

## Proposed execution order

1. Reproduce the staff-send crash and collect a safe error trace; fix that failure first.
2. Correct newest-message fetch/scroll behavior and add regression coverage.
3. Run a real two-way multilingual SMS/Instagram test and close any translation gaps.
4. Measure and improve the pause/resume interaction; test persistence and real-time update.
5. Implement the reference-informed UI after the full-size image/“Open” meaning is confirmed; demonstrate three modes as statuses, but do not enable unapproved outreach.
6. Specify and build the consent-aware automation state machine, then AI-assisted tags, then SMS broadcasts in separate tested releases.

**Release gate:** before the meeting, prefer a stable, honest demo of working inbox, reply, translation, and controls over unfinished broadcast or continuous outreach. The new outreach and broadcast capabilities require separate consent, policy, data, queue, and cost acceptance before production use.
