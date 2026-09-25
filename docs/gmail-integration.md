# Gmail integration

Promotr uses Google OAuth for the dedicated `matt.promotr@gmail.com` mailbox.
The mailbox password is never requested or stored. Incoming email becomes the
same venue-scoped conversation data used by SMS and Instagram, and replies use
the shared Vera prompt, memory, venue knowledge, pause control, and staff inbox.

## Google setup

1. Create a Google Cloud project and enable **Gmail API**.
2. Configure the OAuth consent screen for an external app. During testing, add
   `matt.promotr@gmail.com` as a test user.
3. Create a **Web application** OAuth client.
4. Add this authorized redirect URI exactly:
   `https://<production-domain>/api/integrations/gmail/callback`
5. Add the following Vercel variables without sharing their values in chat:
   `GMAIL_CLIENT_ID`, `GMAIL_CLIENT_SECRET`,
   `GMAIL_EXPECTED_ADDRESS=matt.promotr@gmail.com`, and
   `GMAIL_TOKEN_ENCRYPTION_KEY`.
6. Generate the encryption value locally as 32 random bytes encoded with
   base64. Do not reuse another application secret.
7. Apply `supabase/migrations/202609250001_gmail_messaging.sql`.
8. Deploy, open **Admin → Settings → Gmail inbox**, select **Connect Gmail**,
   sign in as `matt.promotr@gmail.com`, and approve access.

Google OAuth projects left in Testing mode issue short-lived testing
authorizations. Expect the mailbox owner to reconnect after about seven days
until the production OAuth requirements are completed.

## Receiving new email

The safe baseline is a Supabase Cron HTTP job that sends a POST request every
one or two minutes to:

`https://<production-domain>/api/cron/gmail-sync`

It must send `Authorization: Bearer <CRON_SECRET>`. The endpoint imports only
new Inbox messages after connection and is idempotent.

For near-real-time delivery, configure Google Cloud Pub/Sub:

- Set `GMAIL_PUBSUB_TOPIC` to the full topic name.
- Allow `gmail-api-push@system.gserviceaccount.com` to publish to the topic.
- Create an authenticated push subscription to
  `https://<production-domain>/api/webhooks/gmail`.
- Configure its OIDC service account and audience, then set the matching
  `GMAIL_PUBSUB_SERVICE_ACCOUNT_EMAIL` and `GMAIL_PUBSUB_AUDIENCE` in Vercel.

Promotr renews the Gmail mailbox watch when synchronization runs. The secured
cron remains the recovery path if a push notification is delayed or missed.

## Safety boundaries

- Staff must use the Connect Gmail flow; passwords and app passwords are not
  accepted.
- OAuth refresh tokens are encrypted before database storage.
- Automatic and bulk/list emails are ignored to reduce reply loops.
- Outbound promotional campaigns are not enabled by this integration.
- Disconnecting in Settings revokes Google access and deletes the stored
  connection.
