import { ArrowLeft, Check } from "lucide-react";
import Link from "next/link";
import { Brand } from "@/components/brand";
import { ThemeToggle } from "@/components/theme-toggle";

export const metadata = { title: "Inquiry received" };

export default function BookingSuccessPage() {
  return (
    <main className="relative grid min-h-svh place-items-center overflow-hidden px-4 py-8">
      <div className="ambient-glow" aria-hidden="true" />
      <div className="relative w-full max-w-xl">
        <header className="mb-6 flex items-center justify-between">
          <Brand compact />
          <ThemeToggle />
        </header>
        <section className="surface-card p-7 text-center sm:p-10">
          <span className="mx-auto grid size-16 place-items-center rounded-2xl bg-green-500/15 text-green-400">
            <Check size={30} aria-hidden="true" />
          </span>
          <p className="eyebrow mt-6">INQUIRY RECEIVED</p>
          <h1 className="text-foreground mt-2 text-3xl font-semibold tracking-tight">
            We&apos;ve got your request.
          </h1>
          <p className="text-muted mt-4 leading-7">
            The Promotr team will review your details and contact you. Your
            request is not a confirmed booking, and entry or table availability
            is not guaranteed until the venue confirms it.
          </p>
          <Link
            className="focus-ring border-border bg-elevated text-foreground mt-7 inline-flex items-center gap-2 rounded-xl border px-4 py-3 text-sm font-medium"
            href="/book"
          >
            <ArrowLeft size={17} aria-hidden="true" />
            Send another inquiry
          </Link>
        </section>
      </div>
    </main>
  );
}
