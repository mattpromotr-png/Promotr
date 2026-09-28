import type { Metadata } from "next";
import Link from "next/link";

import { LegalPageShell } from "@/components/legal/legal-page-shell";

export const metadata: Metadata = {
  title: "Privacy policy",
  description:
    "How Promotr Night Club handles information shared through its website and guest messaging channels.",
};

export default function PrivacyPage() {
  return (
    <LegalPageShell
      title="Privacy policy"
      description="This policy explains how Promotr Night Club handles information you share when you message us or use our website."
    >
      <section>
        <h2 className="text-xl font-semibold">Information we receive</h2>
        <p className="text-muted mt-2">
          If you contact us by Instagram or SMS, we receive your message, the
          account or phone identifier needed to reply, and conversation details
          such as time and delivery status. If you submit a booking inquiry, we
          receive the contact and event details you enter, including your name,
          contact information, requested date, party size, and any notes.
          Lost-item reports include the contact and item details you provide.
          Website chat messages are saved so Vera and venue staff can answer and
          review the conversation. Our website and service providers may also
          process basic technical and security information needed to operate the
          service.
        </p>
      </section>
      <section>
        <h2 className="text-xl font-semibold">How we use it</h2>
        <p className="text-muted mt-2">
          We use this information to answer questions, manage conversations and
          inquiries, arrange permitted follow-ups, handle lost-and-found
          reports, process table payments, protect the service, and keep
          relevant records. Replies may be generated or translated with AI, with
          venue staff able to review and respond. An inquiry is not a confirmed
          reservation.
        </p>
      </section>
      <section>
        <h2 className="text-xl font-semibold">Who helps provide the service</h2>
        <p className="text-muted mt-2">
          Information is processed by the platforms needed for the channel you
          use and by our service providers: Meta for Instagram messages, Twilio
          for SMS, Supabase for application data, Vercel for website hosting,
          n8n for message workflow automation, OpenAI for AI-assisted replies
          and translation, and Stripe for hosted card payments. Relevant
          information may be processed outside Canada under those
          providers&apos; practices. We do not ask you to send card numbers in
          messages or forms; card details are entered on Stripe&apos;s checkout
          page.
        </p>
      </section>
      <section>
        <h2 className="text-xl font-semibold">Retention and security</h2>
        <p className="text-muted mt-2">
          We keep information while it is needed to provide these services,
          manage requests, resolve disputes, maintain security, or meet
          applicable record-keeping obligations. Access to guest records is
          limited to authorized team members and service providers. No online
          service can promise absolute security.
        </p>
      </section>
      <section>
        <h2 className="text-xl font-semibold">Your choices and requests</h2>
        <p className="text-muted mt-2">
          You can ask what information we hold about you, request a correction
          or deletion, or raise a privacy concern by emailing{" "}
          <a
            className="text-foreground underline underline-offset-4"
            href="mailto:matthew.gucciardi@outlook.com"
          >
            matthew.gucciardi@outlook.com
          </a>
          . We may need to verify your identity before acting. Some records may
          need to be retained where required for a transaction, dispute,
          security, or legal obligation. See our{" "}
          <Link
            className="text-foreground underline underline-offset-4"
            href="/data-deletion"
          >
            data-deletion instructions
          </Link>{" "}
          for how to make a request. For SMS, you can also reply STOP to opt out
          of automated texts.
        </p>
      </section>
      <section>
        <h2 className="text-xl font-semibold">Updates and contact</h2>
        <p className="text-muted mt-2">
          We may update this page as the service changes and will show the new
          date above. For privacy questions, contact Promotr Night Club at{" "}
          <a
            className="text-foreground underline underline-offset-4"
            href="mailto:matthew.gucciardi@outlook.com"
          >
            matthew.gucciardi@outlook.com
          </a>
          .
        </p>
      </section>
    </LegalPageShell>
  );
}
