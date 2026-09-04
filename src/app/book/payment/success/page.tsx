import { CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { Brand } from "@/components/brand";

export const metadata = { title: "Deposit received" };
export default function PaymentSuccessPage() {
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
          We are verifying the payment and your table details. You will receive
          final confirmation from the Promotr team. Keep your Stripe receipt for
          reference.
        </p>
        <Link
          href="/"
          className="focus-ring bg-brand-gradient mt-7 inline-flex min-h-11 items-center rounded-xl px-5 text-sm font-semibold text-white"
        >
          Return to Promotr
        </Link>
      </section>
    </main>
  );
}
