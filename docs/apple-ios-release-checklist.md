# Promotr Manager iOS and App Store resume checklist

Last updated: 2026-09-20

## Current status and blocker

The Promotr Manager mobile app is not yet ready for installation through
TestFlight or the Apple App Store.

The client's Apple Developer Program membership is currently registered as an
**Individual** membership. Apple permits invited users on an Individual
membership to work in App Store Connect, but those users are not members of the
Apple Developer Program team. Therefore, giving the developer the Admin role
does not grant access to **Certificates, Identifiers & Profiles**, signing
certificates, provisioning profiles, App IDs, or Apple Push Notification
service credentials.

The client is converting the membership to an **Organization** membership. Do
not create a replacement Bundle ID, change the app identifier, open a second
Apple Developer membership, or regenerate existing Expo credentials while this
request is pending.

Official references:

- [Update an Individual membership to an Organization membership](https://developer.apple.com/help/account/membership/updating-your-account-information)
- [Apple Developer Program roles and access](https://developer.apple.com/help/account/access/roles)
- [Expo Apple roles and permissions](https://docs.expo.dev/app-signing/apple-developer-program-roles-and-permissions/)

## Fixed project identity

These values were verified from `F:\Promotr-Manager\app.json` on 2026-09-20.
They must remain consistent across Expo, Apple Developer, and App Store
Connect.

| Setting | Required value |
| --- | --- |
| App name | `Promotr Manager` |
| Expo slug | `promotr-manager` |
| iOS Bundle ID | `com.promotr.manager` |
| Android package | `com.promotr.manager` |
| Expo owner | `udaraherath` |
| EAS project ID | `f912e6b8-6fed-42a7-a7a2-89866c6b3cb7` |
| Current app version | `1.0.0` |
| URL scheme | `promotrmanager` |

The Bundle ID is permanent app identity, not a website URL. Use the exact
explicit identifier `com.promotr.manager`; do not invent a new value unless a
confirmed conflict exists in the client's Apple team.

## Phase 1: actions for the client/Account Holder

### Convert the Apple membership

The client must:

1. Register the business as a legal entity.
2. Obtain or confirm the organization's D-U-N-S Number.
3. Sign in at [Apple Developer](https://developer.apple.com/account) with the
   Account Holder Apple Account.
4. Open **Membership details** and submit Apple's request to update the
   Individual membership to an Organization membership.
5. Provide any business documents requested by Apple and wait for written
   approval.
6. Accept any updated Apple Developer Program agreements after approval.

The Account Holder must have authority to bind the organization to legal
agreements. A trading name alone may not qualify; Apple verifies the legal
entity and D-U-N-S record.

### Confirm completion before development resumes

Ask the client for one screenshot from **developer.apple.com/account >
Membership details** showing that the membership is now an Organization. Do not
ask the client to share passwords, one-time codes, private keys, certificates,
or recovery information.

## Phase 2: restore the developer's access

After Apple confirms the Organization membership, the client/Account Holder
should check the developer entry in **App Store Connect > Users and Access**:

1. The invitation uses the same Apple Account email that the developer uses to
   sign in.
2. The invitation has been accepted and two-factor authentication is enabled.
3. The role is **Admin**. App Manager can also be used for app management, but
   Admin is appropriate for completing the initial credentials setup.
4. **Access to Certificates, Identifiers & Profiles** is enabled if Apple shows
   it as a separate permission.
5. Access is not restricted away from the Promotr Manager app.

Then the developer should:

1. Sign out of Apple Developer and App Store Connect, then sign back in.
2. Select the client's Organization team from the team selector.
3. Open [Certificates, Identifiers & Profiles](https://developer.apple.com/account/resources/identifiers/list).
4. Confirm that Identifiers, Certificates, Profiles, and Keys are accessible.

If access is still unavailable, check the Apple Account email, accepted
invitation, selected team, pending Account Holder agreements, and whether Apple
has actually completed the membership conversion before contacting Apple
Developer Support.

## Phase 3: create or verify the Apple app identity

In **Certificates, Identifiers & Profiles > Identifiers**:

1. Search for `com.promotr.manager` before creating anything.
2. If it exists on the correct team, use it and verify its capabilities.
3. If it does not exist, register an **App ID > App** using:
   - Description: `Promotr Manager`
   - Bundle ID type: **Explicit**
   - Bundle ID: `com.promotr.manager`
4. Enable the **Push Notifications** capability.
5. Register the identifier.

Apple's instructions: [Register an App ID](https://developer.apple.com/help/account/identifiers/register-an-app-id).

In **App Store Connect > Apps**, search before creating another record. If no
record exists, create one with:

- Platform: iOS
- Name: `Promotr Manager` (subject to App Store name availability)
- Primary language: the client's preferred App Store language
- Bundle ID: `com.promotr.manager`
- SKU: a stable internal value such as `promotr-manager-ios`
- User access: Full Access unless the client requires a restriction

Record the numeric App Store Connect **Apple ID** after creation. This becomes
the `ascAppId` used by EAS Submit. An app record must exist before a build can be
uploaded. See [Apple's App Store Connect workflow](https://developer.apple.com/help/app-store-connect/get-started/app-store-connect-workflow).

## Phase 4: configure iOS signing and notifications with EAS

Run these commands from `F:\Promotr-Manager` in PowerShell:

```powershell
npx.cmd eas-cli@latest whoami
npx.cmd eas-cli@latest credentials --platform ios
```

Select the `production` profile and the client's correct Apple Organization
team. Allow EAS to create or reuse the following only after reviewing the team
and Bundle ID shown by the CLI:

- Apple Distribution Certificate
- App Store provisioning profile for `com.promotr.manager`
- Apple Push Notifications (APNs) key

Use EAS-managed credentials unless the client requires direct credential
custody. Never commit `.p8`, `.p12`, provisioning profiles, private keys,
App Store Connect API keys, Apple passwords, or `credentials.json` to Git.

Once an authorized Organization member creates and uploads the signing
credentials to the existing Expo project, future EAS builds can reuse them.
Other collaborators do not need the client's Apple password.

Official Expo references:

- [EAS app credentials](https://docs.expo.dev/app-signing/app-credentials/)
- [EAS managed credentials](https://docs.expo.dev/app-signing/managed-credentials/)

## Phase 5: build and submit to TestFlight

Before building:

1. Pull the latest mobile repository revision.
2. Confirm `app.json` still contains `ios.bundleIdentifier` set to
   `com.promotr.manager` and the existing EAS project ID.
3. Confirm production API/Supabase configuration is available through the
   selected EAS environment without exposing server secrets.
4. Run the mobile TypeScript check and test login, conversation lists,
   messages, follow-ups, realtime updates, deep links, sign-out, and push
   registration.
5. Verify the privacy policy and support URLs are public and final.

Create the production build from Windows:

```powershell
npx.cmd eas-cli@latest build --platform ios --profile production
```

After the build succeeds, upload it:

```powershell
npx.cmd eas-cli@latest submit --platform ios
```

If prompted, select the existing Promotr Manager App Store Connect record and
the newest production build. Add the numeric Apple ID as `ascAppId` under the
production submit profile in `eas.json` only after the record exists.

EAS Submit works on Windows; a local Mac is not required for this path. The
uploaded build will appear in TestFlight after Apple finishes processing it.
See [EAS Submit for iOS](https://docs.expo.dev/submit/ios/).

## Phase 6: TestFlight acceptance

Start with internal TestFlight testers. Verify on at least one real iPhone:

- installation and first launch;
- admin authentication and correct venue authorization;
- SMS and Instagram conversation filters;
- conversation history and English admin view;
- staff replies reaching the correct guest/channel;
- follow-up list and resolve workflow;
- background and foreground push notifications;
- notification tap opening the correct conversation;
- unread counts and realtime message updates;
- keyboard/safe-area behavior and latest-message scrolling;
- loading, offline, expired-session, permission-denied, and retry states;
- no service-role, Twilio, OpenAI, APNs, or other server secret in the app.

Only move to external testers or App Review after these checks pass. External
TestFlight distribution may require Apple beta review.

## Phase 7: prepare the App Store submission

Complete the required App Store Connect information:

- app name, subtitle, description, keywords, category, and age rating;
- support URL, privacy policy URL, and marketing URL if used;
- iPhone/iPad screenshots for every required device class supported by the
  build;
- app icon and copyright;
- pricing and distribution territories;
- App Privacy answers matching actual Supabase, Expo notification, analytics,
  authentication, and messaging data flows;
- export-compliance questions;
- review contact details and review notes;
- a working review account with non-sensitive sample data if login is required;
- clear instructions explaining how the reviewer reaches conversations,
  follow-ups, and notifications.

Do not state that data is uncollected or unlinked without checking the actual
production implementation. The app processes manager identity, device push
tokens, conversation/contact information, and operational messaging data.

An Account Holder, Admin, or App Manager can select the processed build and
submit it to App Review. See [Submit an app](https://developer.apple.com/help/app-store-connect/manage-submissions-to-app-review/submit-an-app).

## Definition of complete

iOS work is complete only when all of the following are evidenced:

- Organization membership is approved.
- Developer can access the client's Certificates, Identifiers & Profiles.
- `com.promotr.manager` exists once on the correct Apple team.
- Push Notifications is enabled and EAS has valid iOS signing/APNs credentials.
- A production build uploads and processes successfully in App Store Connect.
- TestFlight installation and the full real-device acceptance checklist pass.
- Required App Store metadata and privacy disclosures are complete.
- Apple accepts the app and the client deliberately releases it.

## Work while Apple is blocked

Apple account conversion does not block the shared backend or Android app.
Until the client confirms the Organization membership, prioritize:

1. direct Meta/Instagram messaging integration when credentials are available;
2. production email provider and verified sending-domain setup;
3. voice/calling architecture, consent, escalation, transcripts, and costs;
4. shared multichannel conversation identity and admin workflows;
5. Android/mobile regression testing so the same business logic is already
   stable before the iOS build.

