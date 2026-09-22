# Vera prompt architecture and source coverage

The client source is `Vera — The Promotr Lounge AI Concierge Master Prompt.pdf` (23 pages, 42 numbered sections). `src/prompts/vera/master.ts` holds the permanent identity, objective, style, accuracy, memory, privacy, safety, booking, and scope rules. `src/prompts/vera/scenarios/` contains separate scenario-specific instructions. `router.ts` selects at most three playbooks from the latest guest message; it consults previous messages only for a genuinely short follow-up. The general-nightlife fallback handles safe, unlisted topics and redirects unrelated topics. The application sends only the master, selected playbooks, verified memory, Toronto calendar, and recent messages to the model—not the whole PDF.

SMS and Instagram both call `generateConciergeReply()` in `src/lib/messaging/concierge.ts`; neither has a separate Vera prompt. Channel delivery and guest identity remain separate. Memory from different accounts must not be merged without verifying ownership.

| PDF section(s) | Maintained source |
| --- | --- |
| 1 Personality; 2 SMS style; 25 Sales behavior; 26 Unknown questions; 41 Main objective; 42 Golden rules | `master.ts`, `scenarios/general-nightlife.ts` |
| 3 First message/name | `scenarios/opening.ts` |
| 4 Venue information; 19 Walk-ins | `scenarios/venue-basics.ts` |
| 5 Age and ID | `scenarios/age-id.ts` |
| 6 General admission; 7 Guest list | `scenarios/admission-guest-list.ts` |
| 8 Table service; 9 Table recommendations; 10 Table questions; 20 Reservations; 21 Groups; 22 VIP | `scenarios/tables-reservations.ts` |
| 11 Dress code | `scenarios/dress-code.ts` |
| 12 Birthdays | `scenarios/celebrations.ts` |
| 13 Music; 14 DJs and events; 38 Celebrities | `scenarios/music-events.ts` |
| 15 Bottle service | `scenarios/bottle-service.ts` |
| 16 Bar and drinks; 17 Food | `scenarios/bar-food.ts` |
| 18 Parking and transportation | `scenarios/transport.ts` |
| 23 First-time guests; 24 Playful questions | `scenarios/identity-social.ts` |
| 27 Safety; 28 Illegal drugs; 29 Alcohol safety; 36 Security | `scenarios/safety.ts` |
| 30 Rude or angry guests | `scenarios/complaints.ts` |
| 31 Discounts; 32 Free tables | `scenarios/discounts.ts` |
| 33 Cancellations/refunds | `scenarios/refunds-cancellations.ts` |
| 34 Accessibility | `scenarios/accessibility.ts` |
| 35 Lost and found | `scenarios/lost-found.ts` |
| 37 Photos | `scenarios/photos.ts` |
| 39 Private events | `scenarios/private-events.ts` |
| 40 Quick-reference facts | `src/config/venue-facts.v2.ts`, referenced by relevant scenario files |

Later client instructions are also maintained: staff privacy in `scenarios/staff-privacy.ts`; on-site recommendations instead of advertising nearby businesses in `scenarios/nearby.ts`; Toronto slang in `scenarios/toronto-slang.ts`; broader safe questions in `scenarios/general-nightlife.ts`. The shared master forbids invented dates and false booking claims; server code supplies Toronto-local time and trusted links. Where a PDF example asks Vera to collect every reservation field in chat, the later guest-driven booking-form decision governs: the form collects those fields after an explicit request, and Vera does not force a chat interview.

`src/prompts/vera/scenario-coverage.test.ts` contains a routing example for every scenario module and checks the prompt-size cap and unrelated-topic reset. These tests validate assembly, not real model behavior. Before client handoff, run representative SMS and Instagram conversations, including multi-turn memory, date rollover, mixed intents, unavailable facts, safety, and handoff. Review model replies against the PDF and later client decisions; do not call the system fully accepted based only on unit tests.
