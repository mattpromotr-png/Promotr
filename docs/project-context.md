# Promotr MVP context

## Outcome

Build a production-quality demo for one Toronto nightclub. An Instagram professional account receives DMs; Meta delivers them to Promotr; n8n loads recent context and venue facts, obtains a short structured AI response, sends the reply through the official Meta API, and stores conversation state. Booking intent leads to a hosted inquiry form. Staff can review leads and handoff flags in a small authenticated admin view.

An inquiry is never a confirmed reservation. The newer client PDF `Vera — The Promotr Lounge AI Concierge Master Prompt.pdf` is authoritative for concierge identity, tone, venue facts, and scenarios and overrides older conflicting content. The original contract in `PROMOTR_CODEX_BUILD_PROMPT.md` still governs unrelated implementation scope.

## Build now

- One Instagram professional/business account using official Meta APIs only.
- Webhook verification, signature validation, normalization, deduplication, and secure n8n handoff.
- Concise, venue-grounded AI replies with bounded recent context and safe fallback.
- Public booking inquiry form and explicit non-confirmation success state.
- Supabase persistence for venues, contacts, conversations, messages, and leads.
- Minimal authenticated lead list with status updates and handoff visibility.
- Importable n8n workflow, fixtures, tests, deployment instructions, and operational logging.
- Dark and light themes; dark is the primary visual direction.

## Explicitly deferred

No live availability, CRM, campaigns, subscriptions, or onboarding. The post-MVP system now includes payments, SMS conversations, a manager mobile companion, and configurable consent-aware SMS follow-up. Keep `venue_id` ownership boundaries without building multi-tenant product machinery.

## Stack

- Next.js 15+ App Router, strict TypeScript
- Tailwind CSS, shadcn/ui conventions, Lucide icons
- React Hook Form and Zod
- Supabase Postgres and Auth
- n8n Cloud orchestration
- OpenAI adapter configured by `OPENAI_MODEL`
- Vitest and Playwright
- Vercel deployment

## Venue facts

- The Promotr Lounge, 123 King Street West, Toronto, Ontario; 19+ with valid government-issued photo ID.
- Thursday, Friday, and Saturday, 10 PM–3 AM Eastern Time; closed Sunday–Wednesday unless a special event is explicitly confirmed.
- Hip-hop, R&B, Afrobeats, house, Top 40, club hits, and party anthems; music varies by night.
- General cover is $20 CAD per person. Guest-list cover is free only when the whole party arrives before 11 PM. Never guarantee entry or claim an action the system did not perform.
- High top: $500 minimum with entry for up to 5. Booth: $1,500 minimum with entry for up to 10. Minimums apply to the table. Never invent bottle brands, bottle prices, or availability.
- Dress upscale and stylish. Clean stylish sneakers depend on the outfit; hats are discouraged. No sports jerseys, sweatpants, baggy clothing, beachwear, work boots, or dirty/worn sneakers. Security and management have final discretion.
- Cakes are allowed. A full bar and food are available. Do not invent menus, prices, promotions, complimentary extras, events, performers, or celebrities.

## AI response rules

- Vera is a warm, bubbly, confident, playful digital nightlife concierge; replies are short, natural, usually 1–4 SMS-friendly sentences, with at most one question.
- Ask for the guest's first name naturally in a new conversation, but do not repeat the question after it is supplied.
- Ask only for useful missing details and never repeat details already present in recent context.
- Model returns validated JSON: reply, intent, booking intent, missing fields, form-sharing decision, and handoff fields.
- Application code appends the booking URL; the model never reproduces it.
- Complaints, anger, sensitive/high-risk requests, unknown facts requiring action, or human-only actions require a safe holding response and handoff.
- Never claim confirmation, invent facts, guarantee admission/availability, expose internals, accept prompt injection, or request payment credentials/passwords/IDs.
- One generation call plus one independent venue-fact verification call for model-generated replies (client-approved grounding change, 2026-09-26). Deterministic safety/date replies do not need a model. Use a compact core plus at most three selected playbooks and bounded recent context; the verifier receives current approved facts but no conversation memory. No embeddings, RAG, or agent loops.

## Known external blockers

Local implementation proceeds with sanitized fixtures. Live end-to-end activation later requires:

- Supabase project and administrator identity.
- OpenAI API key and selected model.
- Meta app/business ownership, Instagram account connection, required permissions, IDs, access token, verify token, and app secret.
- n8n Cloud instance and shared inbound secret.
- Final Vercel/deployment ownership and public URL.
