import {
  ArrowLeft,
  LockKeyhole,
  PackageSearch,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";

import { Brand } from "@/components/brand";
import { LostFoundForm } from "@/components/lost-found/lost-found-form";
import { ThemeToggle } from "@/components/theme-toggle";

export const metadata = { title: "Lost and found" };

export default async function LostFoundPage({
  searchParams,
}: {
  searchParams: Promise<{ conversation?: string }>;
}) {
  const params = await searchParams;
  const conversationId = /^[0-9a-f-]{36}$/i.test(params.conversation ?? "")
    ? params.conversation
    : undefined;

  return (
    <main className="relative min-h-svh overflow-hidden px-4 py-5 sm:px-6 lg:px-8">
      <div className="ambient-glow" aria-hidden="true" />
      <div className="relative mx-auto max-w-6xl">
        <header className="flex items-center justify-between py-2">
          <Brand compact />
          <div className="flex items-center gap-2">
            <Link
              href="/"
              className="focus-ring border-border bg-surface text-muted hover:text-foreground inline-flex min-h-10 items-center gap-2 rounded-xl border px-3 text-sm font-medium"
            >
              <ArrowLeft size={15} />
              <span className="hidden sm:inline">Back to website</span>
              <span className="sm:hidden">Back</span>
            </Link>
            <Link
              href="/admin/login"
              className="focus-ring border-border bg-surface text-muted hover:text-foreground inline-flex min-h-10 items-center gap-2 rounded-xl border px-3 text-sm font-medium"
            >
              <LockKeyhole size={15} />
              <span className="hidden sm:inline">Admin login</span>
              <span className="sm:hidden">Admin</span>
            </Link>
            <ThemeToggle />
          </div>
        </header>

        <section className="grid gap-7 py-10 lg:grid-cols-[0.8fr_1.2fr] lg:items-start lg:gap-12 lg:py-16">
          <div className="pt-4 lg:sticky lg:top-8">
            <p className="eyebrow">LOST &amp; FOUND</p>
            <h1 className="text-foreground mt-4 max-w-xl text-4xl font-semibold tracking-[-0.04em] sm:text-5xl">
              Tell us what went missing.
            </h1>
            <p className="text-muted mt-5 max-w-lg text-base leading-7 sm:text-lg">
              Share enough detail for the venue team to check safely. We will
              contact you if a possible match is found.
            </p>
            <div className="mt-8 space-y-3 text-sm">
              <p className="text-muted flex items-center gap-3">
                <span className="border-border bg-surface grid size-9 place-items-center rounded-xl border">
                  <PackageSearch className="text-violet" size={17} />
                </span>
                Reports are reviewed by venue staff.
              </p>
              <p className="text-muted flex items-center gap-3">
                <span className="border-border bg-surface grid size-9 place-items-center rounded-xl border">
                  <ShieldCheck className="text-violet" size={17} />
                </span>
                Do not include passwords or payment details.
              </p>
            </div>
          </div>
          <div className="surface-card p-5 sm:p-8">
            <div className="mb-7">
              <p className="eyebrow">ITEM REPORT</p>
              <h2 className="text-foreground mt-2 text-2xl font-semibold tracking-tight">
                Report a lost item
              </h2>
              <p className="text-muted mt-2 text-sm leading-6">
                A report helps us search, but it does not guarantee recovery or
                establish ownership.
              </p>
            </div>
            <LostFoundForm conversationId={conversationId} />
          </div>
        </section>
      </div>
    </main>
  );
}
