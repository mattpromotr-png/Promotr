# Meta Instagram setup

Verified against Meta's maintained Instagram API collection on 2026-08-31. Meta changes its dashboard and version lifecycle; confirm the selected Graph API version in the app dashboard before activation.

This MVP uses **Instagram API with Instagram Login** and `graph.instagram.com`. For this path, a Facebook Page is not required. Do not mix its permission names or endpoints with the older Facebook Login/Page-mediated path.

Official references:

- [Meta Instagram API collection](https://www.postman.com/meta/instagram/documentation/6yqw8pt/instagram-api)
- [Meta Send API requirements](https://www.postman.com/meta/instagram/folder/uxudqu0/send-api)
- [Meta Instagram user/profile and webhook requirements](https://www.postman.com/meta/instagram/folder/23987686-22b3a5b0-4a51-449a-9299-e3667d69b182)

## Owner prerequisites

- Instagram Professional account: Business or Creator.
- A Meta developer/business app owned by the intended deployment owner.
- During development, the owner/test Instagram account and each tester must have the appropriate app/account role.
- The guest must initiate the conversation. Promotr does not perform unsolicited outbound messaging.

Never provide an Instagram or Facebook password to a developer. Authorization uses Meta's app/account flow and access tokens.

## Required scopes and access

Request only the scopes needed for this demo:

- `instagram_business_basic`
- `instagram_business_manage_messages`

The older `business_basic` and `business_manage_messages` scope names are deprecated and must not be used.

Standard Access is sufficient while the app serves an account owned/managed by the app team and configured in the dashboard. Serving professional accounts outside that ownership boundary requires Advanced Access, app review, and any applicable business verification.

## Webhook configuration

1. Deploy the Next.js application to its final HTTPS domain.
2. In the Meta app's Instagram webhook configuration, set callback URL:
   `https://YOUR_DOMAIN/api/webhooks/meta`
3. Set the same random verify token in Meta and Vercel as `META_VERIFY_TOKEN`.
4. Subscribe to the `messages` field. `messaging_postbacks`, `messaging_optins`, and `messaging_referral` are not required by the current text-DM MVP.
5. Store the Instagram secret from **Instagram > API setup with Instagram login** as `META_INSTAGRAM_APP_SECRET`. If testing the parent Meta app's webhook configuration too, store that same app's **App settings > Basic** secret as `META_BASIC_APP_SECRET`. These are explicit allowed signing keys: the route requires a valid `X-Hub-Signature-256` over the original request bytes and logs only which source matched. The old `META_APP_SECRET` remains a compatibility fallback. Never disable signature verification to get a successful test.
6. Complete the dashboard verification challenge. A correct request receives the raw `hub.challenge` value.

The application ignores echoes, non-text events, malformed events, and repeated provider message IDs before AI work.

## Token and identifier mapping

- `META_APP_ID`: Meta app identifier; Vercel configuration/reference only.
- `META_INSTAGRAM_APP_SECRET`: Instagram Login app signing secret; server-only.
- `META_BASIC_APP_SECRET`: optional parent Meta app signing secret, belonging to the same configured app; server-only.
- `META_APP_SECRET`: legacy signing-secret fallback; server-only.
- `META_VERIFY_TOKEN`: shared only between Meta webhook setup and Vercel.
- `META_ACCESS_TOKEN`: Promotr Instagram user/system-user access token stored server-side in Vercel for the application's Send API adapter.
- `META_INSTAGRAM_ACCOUNT_ID`: professional account ID used by the Send API.
- `META_PAGE_ID`: unused for Instagram Login; retained as an optional placeholder only if the owner deliberately selects the Facebook Login path later.
- `META_GRAPH_API_VERSION`: currently supported version selected for the app, stored server-side in Vercel (for example `v24.0`; verify the version available to the app).

The outbound endpoint used by the Next.js application is:

```text
POST https://graph.instagram.com/{api-version}/{ig-account-id}/messages
```

The recipient is the Instagram-scoped sender ID received in the `messages` webhook.

## Development-mode live test

1. Add the test account and tester roles in the Meta app/account setup.
2. Import and activate the handoff-only n8n workflow, configure its production webhook URL in Vercel, and put `META_ACCESS_TOKEN` in Vercel rather than n8n. Follow `docs/instagram-integration-plan.md` for the full rollout order.
3. Send a new DM from the permitted tester to the professional account.
4. Confirm one `webhook_events` record, one inbound `messages` record, and one outbound record.
5. Repeat the exact webhook fixture/message ID and confirm it is not forwarded twice.
6. Test a complaint and confirm `/admin/leads` displays it under **Human follow-up** even without a lead submission.

Do not describe the integration as customer-ready until required access level, app review/business verification, rate limits, messaging window, privacy disclosures, and data deletion obligations are confirmed for the final owner.

## Diagnostic checks

`scripts/diagnose-instagram.mjs` reads the ignored local `.env`. It outputs secret presence and comparison results, never secret values or guest messages.

- `node scripts/diagnose-instagram.mjs --live --origin https://YOUR_DOMAIN` sends an empty signed webhook and invalid empty internal/n8n events, then reads the Instagram token's identity and account subscriptions. The internal endpoint should return **400 Invalid event** when authentication succeeds; **401** means the shared secret was rejected. An n8n 500 for this intentionally invalid payload is not evidence that real messages fail.
- `node scripts/diagnose-instagram.mjs --vercel --origin https://YOUR_DOMAIN` uses a temporary local `VERCEL_TOKEN` to inspect the domain's actual deployment and production configuration. Vercel sensitive variables cannot be decrypted; the tool reports this rather than claiming their values match.
- Adding `--sync-signing` to the Vercel command explicitly writes only the two named app signing secrets from local `.env` into Production. Redeploy afterward. This flag is a configuration change, not a read-only check.

After deployment, `Meta webhook authenticated` proves a signature match. `Meta webhook ignored` identifies unsupported test payloads or another recipient account; these do not run n8n. `Meta webhook forwarded to n8n` proves a successful handoff response. Complete a real guest DM and verify its reply separately.
