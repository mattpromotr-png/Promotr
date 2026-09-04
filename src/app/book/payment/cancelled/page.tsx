import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Brand } from "@/components/brand";

export const metadata = { title: "Payment not completed" };
export default function PaymentCancelledPage() {
  return (
    <main className="relative grid min-h-svh place-items-center overflow-hidden px-4 py-8">
      <div className="ambient-glow" />
      <section className="surface-card relative max-w-xl p-8 text-center sm:p-11">
        <Brand compact />
        <p className="eyebrow mt-8">PAYMENT NOT COMPLETED</p>
        <h1 className="text-foreground mt-2 text-3xl font-semibold">
          No charge was made.
        </h1>
        <p className="text-muted mt-4 leading-7">
          Your table is not confirmed. Return to the booking form to choose an
          available table and try again.
        </p>
        <Link
          href="/book"
          className="focus-ring border-border bg-elevated text-foreground mt-7 inline-flex min-h-11 items-center gap-2 rounded-xl border px-5 text-sm font-semibold"
        >
          <ArrowLeft size={17} />
          Return to booking
        </Link>
      </section>
    </main>
  );
}
