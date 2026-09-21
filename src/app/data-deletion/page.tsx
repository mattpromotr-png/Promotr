import type { Metadata } from "next";
import Link from "next/link";

import { LegalPageShell } from "@/components/legal/legal-page-shell";

export const metadata: Metadata = {
  title: "Data deletion",
  description:
    "How to request deletion of information held by Promotr Night Club.",
};

export default function DataDeletionPage() {
  return (
    <LegalPageShell
      title="Request data deletion"
      description="You can ask Promotr Night Club to review and delete personal information connected with your conversations or inquiries."
    >
      <section>
        <h2 className="text-xl font-semibold">How to make a request</h2>
        <p className="text-muted mt-2">
          Email{" "}
          <a
            className="text-foreground underline underline-offset-4"
            href="mailto:matthew.gucciardi@outlook.com?subject=Promotr%20data%20deletion%20request"
          >
            matthew.gucciardi@outlook.com
          </a>{" "}
          with the subject <strong>Promotr data deletion request</strong>. Tell
          us which channel you used (Instagram, SMS, or our website), the
          Instagram username, phone number, or email address involved, and
          approximately when you contacted us. Please do not send passwords, ID
          photos, or payment card details.
        </p>
      </section>
      <section>
        <h2 className="text-xl font-semibold">What happens next</h2>
        <p className="text-muted mt-2">
          We will review the request, may ask you to verify that the account or
          contact information is yours, and respond about what can be removed
          from Promotr&apos;s records. We may retain records needed for a
          payment, dispute, security matter, or legal obligation. Deleting
          information from Promotr does not delete messages or records held
          independently by Instagram, your phone provider, or other services you
          use.
        </p>
      </section>
      <section>
        <h2 className="text-xl font-semibold">Other privacy questions</h2>
        <p className="text-muted mt-2">
          You can use the same email address to request access or correction, or
          to ask a question about how we handle your information. Read our{" "}
          <Link
            className="text-foreground underline underline-offset-4"
            href="/privacy"
          >
            privacy policy
          </Link>{" "}
          for more detail.
        </p>
      </section>
    </LegalPageShell>
  );
}
