# Vera concierge configuration

The client's newer `Vera — The Promotr Lounge AI Concierge Master Prompt.pdf` is the authority for Vera's identity, tone, venue facts, and conversation scenarios. It overrides older conflicting concierge facts in project documentation, seeds, fixtures, and prompts.

## Runtime design

- `src/prompts/vera/core.ts` is the small prompt loaded on every AI turn.
- `src/prompts/vera/scenarios.ts` contains focused client-approved playbooks.
- `src/prompts/vera/router.ts` deterministically loads no more than three relevant playbooks from bounded recent context.
- `src/config/venue-facts.v2.ts` is the structured application fact source.
- The router adds no model call, embeddings, or vector database.
- Application policy still controls booking-link insertion and deterministic human handoff.

## Change rule

Update the structured facts and the matching scenario text together. Add or change a router keyword only when a real test case needs it. Do not expand the core prompt with scenario-specific prices, policies, or scripts.
