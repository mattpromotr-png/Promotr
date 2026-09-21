import type { ReactNode } from "react";
import Link from "next/link";

import { Brand } from "@/components/brand";

export function LegalPageShell({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <main className="bg-canvas text-foreground min-h-svh">
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-12">
        <header className="border-border flex items-center justify-between gap-4 border-b pb-6">
          <Brand compact />
          <Link
            href="/"
            className="focus-ring text-muted hover:text-foreground text-sm underline underline-offset-4"
          >
            Back to Promotr
          </Link>
        </header>
        <div className="py-10 sm:py-14">
          <p className="eyebrow">Promotr Night Club</p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">
            {title}
          </h1>
          <p className="text-muted mt-4 max-w-2xl leading-7">{description}</p>
          <p className="text-muted mt-3 text-sm">
            Last updated September 21, 2026
          </p>
          <div className="mt-10 space-y-9 text-sm leading-7 sm:text-base">
            {children}
          </div>
        </div>
        <footer className="border-border text-muted flex flex-wrap gap-x-6 gap-y-2 border-t pt-6 text-sm">
          <Link
            href="/privacy"
            className="hover:text-foreground underline underline-offset-4"
          >
            Privacy policy
          </Link>
          <Link
            href="/data-deletion"
            className="hover:text-foreground underline underline-offset-4"
          >
            Data deletion
          </Link>
          <a
            href="mailto:matthew.gucciardi@outlook.com"
            className="hover:text-foreground underline underline-offset-4"
          >
            Contact
          </a>
        </footer>
      </div>
    </main>
  );
}
