# Vera live-model quality review — September 26, 2026

## Scope

24 synthetic conversations, eight cases each through SMS, Instagram, and email
presentation modes in the local shared concierge engine. Used real OpenAI
generation and grounding calls with local configured `gpt-4.1-mini`. Synthetic
clock: September 26, 2026, 10 AM Toronto. Synthetic active General update:
October 2 closure. No production records changed and no messages sent through
Twilio, Meta, or Gmail. This is not end-to-end platform delivery certification.

The suite is opt-in: set `RUN_LIVE_VERA_QUALITY=1`, then run
`npx vitest run src/lib/messaging/vera-quality.live.test.ts --pool=threads --maxWorkers=1`.
It uses paid API calls. Each model-generated turn normally makes two calls.

## First-run automated results

19 of 24 assertions passed. Welcome, dress-code FAQ, relative-date closure,
explicit-date closure, and no-pressure conversation endings passed in all three
presentation modes. The removed offer was not revived. Emails passed the
signature/no-emoji checks. These assertions are narrow, not a complete subjective
tone or full-scenario certification.

Guest memory failed in all three modes: the supplied name Maya and party of six
were not consistently retained in the final reply. One email even greeted Maya
then claimed not to have her name. This creates unnecessary repeated questions.

SMS off-topic failed: the final answer explained machine learning and asked for
the guest's name instead of keeping the Promotr scope boundary.

Instagram removed-offer had two findings: its negative answer used a curly
apostrophe missed by the original assertion (test false positive), but it also
claimed other events and specials existed without supporting sources (real
qualitative failure). The test was updated to accept either apostrophe and to
reject that unsupported alternative-offer claim.

## Diagnosis and next fixes

The independent grounding gate receives no guest memory and does not carry the
complete master scope rules. Its venue-only source restriction can remove valid
guest details, and its rewrite can introduce off-topic content or unsupported
positive alternatives. These are inspected-code explanations consistent with
observed failures; the exact stage responsible still needs stage-level tracing.

Separate verified guest context from venue evidence in the gate; guest context
must never establish promotions. Preserve Promotr scope and no-pressure behaviour
through the final rewrite. Require any positive alternative to be supported by
current facts. Re-run failures, then test real inbound/reply delivery and actual
persisted memory on all three platforms. Do not claim customer attraction or
production readiness from these synthetic tests.

No production behaviour was changed during this review.

The SMS guest-memory case was repeated independently and failed again: the reply
greeted Maya but denied having the supplied name/party count and asked for the
count again. This was not resolved by a rerun.

Evaluation approach: representative scenarios and explicit criteria, following
[OpenAI evaluation guidance](https://developers.openai.com/api/docs/guides/evaluation-best-practices).

## Improvement implementation and retest

Vera v13 now shares the permanent master rules with the grounding gate and sends
bounded guest context separately from approved venue evidence. Latest guest
corrections take priority, old plans are historical rather than automatically
current, and unrelated past details must not be volunteered. Scope and supported-
only alternatives remain enforced during the final rewrite. Recall-only answers
should not add qualification questions. Email body cleanup removes emojis and
duplicate English greetings while retaining the application signature.

The first post-fix quality run passed 22/24; two email-body emoji assertions failed.
After email cleanup, the full 24/24 synthetic quality suite passed. Seven separate
real-model grounding cases passed (six-case suite plus one relevance-only run),
including fresh party-size correction, stale guest-memory pizza claims, irrelevant
old plans, active/cancelled offers, and the relative-date closure. Seventy-seven
targeted unit tests, TypeScript, and lint passed.

These are sampled model results, not a guarantee across every possible phrasing.
Actual provider delivery and production persisted-memory behaviour still need
end-to-end verification after deployment. No model change, production database
write, or provider send was performed. Improvements remain local.
