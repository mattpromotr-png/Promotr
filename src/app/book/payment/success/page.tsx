import { CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { Brand } from "@/components/brand";
import { createStripeClient } from "@/lib/stripe/server";
import { reconcilePaidCheckout } from "@/lib/stripe/reconcile-checkout";

export const metadata = { title: "Deposit received" };
export default async function PaymentSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{
    session_id?: string;
    booking?: string;
    token?: string;
  }>;
}) {
  const { session_id: sessionId, booking, token } = await searchParams;
  let paymentRecorded = false;
  if (sessionId) {
    try {
      const session =
        await createStripeClient().checkout.sessions.retrieve(sessionId);
      if (!booking || session.metadata?.booking_id === booking)
        paymentRecorded = await reconcilePaidCheckout(session);
    } catch {
      paymentRecorded = false;
    }
  }
  const manageHref =
    booking && token
      ? `/book/manage/${encodeURIComponent(booking)}?token=${encodeURIComponent(token)}`
      : null;
  return (
    <main className="relative grid min-h-svh place-items-center overflow-hidden px-4 py-8">
      <div className="ambient-glow" />
      <section className="surface-card relative max-w-xl p-8 text-center sm:p-11">
        <Brand compact />
        <CheckCircle2 className="mx-auto mt-8 text-emerald-400" size={58} />
        <p className="eyebrow mt-6">PAYMENT RECEIVED</p>
        <h1 className="text-foreground mt-2 text-3xl font-semibold">
          Your deposit was submitted.
        </h1>
        <p className="text-muted mt-4 leading-7">
          {paymentRecorded
            ? "Your payment has been verified and the booking is now recorded. Keep your Stripe receipt and private management link for reference."
            : "We are verifying the payment and your table details. You will receive final confirmation from the Promotr team. Keep your Stripe receipt for reference."}
        </p>
        <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
          {manageHref && (
            <Link
              href={manageHref}
              className="focus-ring bg-brand-gradient inline-flex min-h-11 items-center justify-center rounded-xl px-5 text-sm font-semibold text-white"
            >
              Manage booking
            </Link>
          )}
          <Link
            href="/"
            className="focus-ring border-border bg-elevated text-foreground inline-flex min-h-11 items-center justify-center rounded-xl border px-5 text-sm font-semibold"
          >
            Return to Promotr
          </Link>
        </div>
        {manageHref && (
          <p className="text-muted mt-4 text-xs">
            Open “Manage booking” and save that private link so you can update
            or cancel later.
          </p>
        )}
      </section>
    </main>
  );
}
