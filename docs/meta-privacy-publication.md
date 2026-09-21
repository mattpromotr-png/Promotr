# Meta privacy publication checklist

The public `/privacy` and `/data-deletion` pages are implementation drafts for Promotr Night Club. They reflect the current application code, but the business owner must review and approve them before they are used as formal policy statements in Meta App Settings.

Before publication, confirm with the owner:

- “Promotr Night Club” is the correct public business name and `matthew.gucciardi@outlook.com` is the monitored privacy/deletion contact.
- The listed providers and data uses accurately describe the deployed service, including Instagram/SMS, AI processing, payments, and lost-and-found records.
- The actual retention schedule, access controls, deletion workflow, and any legal/accounting exceptions. The draft does not claim an unimplemented automatic deletion period or response deadline.
- Whether a separate Promotr terms-of-service page exists; do not use `https://www.facebook.com/` as Promotr's terms or data-deletion URL.

After owner approval and deployment, verify both pages load publicly over HTTPS without authentication. Then enter `https://promotrclub.vercel.app/privacy` as Meta's Privacy Policy URL and `https://promotrclub.vercel.app/data-deletion` as the Data Deletion Instructions URL (only if that remains the production domain). Select an accurate category, add an app icon, save, and re-check the Publish screen for further requirements. Publishing and permission approval are separate from a successful end-to-end Instagram DM test.
