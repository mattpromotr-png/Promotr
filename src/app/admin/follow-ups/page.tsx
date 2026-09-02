import {
  AlertTriangle,
  CalendarClock,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  MessageCircle,
  UserRound,
} from "lucide-react";
import Link from "next/link";

import { AdminShell } from "@/components/admin/admin-shell";
import { PageHeading } from "@/components/admin/page-heading";
import { ResolveFollowUpButton } from "@/components/admin/resolve-follow-up-button";
import { requireAdmin } from "@/lib/auth/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { cn } from "@/lib/utils";

export const metadata = { title: "Human follow-ups" };
export const dynamic = "force-dynamic";
const PAGE_SIZE = 20;

type FollowUp = {
  id: string;
  handoff_reason: string | null;
  last_message_at: string;
  contacts: { display_name: string | null; instagram_scoped_id: string } | null;
  leads: Array<{ id: string; name: string }> | null;
};

export default async function FollowUpsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  await requireAdmin();
  const params = await searchParams;
  const requestedPage = Number.parseInt(params.page ?? "1", 10);
  const page =
    Number.isFinite(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  const admin = createAdminClient();
  const result = await admin
    .from("conversations")
    .select(
      "id,handoff_reason,last_message_at,contacts(display_name,instagram_scoped_id),leads(id,name)",
      { count: "exact" },
    )
    .eq("status", "handoff_required")
    .order("last_message_at", { ascending: false })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
  if (result.error) throw new Error("Unable to load human follow-ups.");

  const followUps = (result.data ?? []) as unknown as FollowUp[];
  const total = result.count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <AdminShell active="follow-ups">
      <PageHeading
        eyebrow="TEAM ATTENTION"
        title="Human follow-up"
        description="These conversations need a staff decision, confirmation, or sensitive response that the AI should not provide."
      />

      <div className="mt-7 rounded-2xl border border-amber-500/20 bg-amber-500/8 p-4 text-sm leading-6 text-amber-900 dark:text-amber-100/85">
        <div className="flex gap-3">
          <AlertTriangle className="mt-0.5 shrink-0 text-amber-500" size={18} />
          <p>
            Review the reason, respond to the guest through the available
            contact channel, then mark the item resolved. Resolving a follow-up
            does not confirm a booking.
          </p>
        </div>
      </div>

      {followUps.length === 0 ? (
        <div className="surface-card mt-6 grid place-items-center p-14 text-center">
          <div className="grid size-12 place-items-center rounded-2xl bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
            <AlertTriangle size={21} />
          </div>
          <h2 className="text-foreground mt-4 font-semibold">
            Nothing needs attention
          </h2>
          <p className="text-muted mt-2 text-sm">
            There are no open human follow-ups.
          </p>
        </div>
      ) : (
        <div className="mt-6 grid gap-4 xl:grid-cols-2">
          {followUps.map((followUp) => {
            const relatedLead = followUp.leads?.[0];
            return (
              <article
                key={followUp.id}
                className="surface-card flex flex-col p-5 sm:p-6"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-300">
                      <UserRound size={19} />
                    </div>
                    <div className="min-w-0">
                      <h2 className="text-foreground truncate font-semibold">
                        {followUp.contacts?.display_name ||
                          relatedLead?.name ||
                          "Instagram guest"}
                      </h2>
                      <p className="text-muted mt-1 text-xs">
                        Contact …
                        {followUp.contacts?.instagram_scoped_id.slice(-4) ||
                          "unknown"}
                      </p>
                    </div>
                  </div>
                  <span className="shrink-0 rounded-full border border-amber-500/25 bg-amber-500/10 px-2.5 py-1 text-xs font-medium text-amber-700 dark:text-amber-300">
                    Needs review
                  </span>
                </div>

                <div className="border-border bg-elevated mt-5 flex-1 rounded-2xl border p-4">
                  <p className="text-muted text-xs font-medium tracking-wide uppercase">
                    Reason
                  </p>
                  <p className="text-foreground mt-2 text-sm leading-6">
                    {followUp.handoff_reason ||
                      "The AI requested human assistance."}
                  </p>
                </div>

                <div className="mt-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                  <p className="text-muted flex items-center gap-2 text-xs">
                    <CalendarClock size={15} className="text-violet" />
                    {new Intl.DateTimeFormat("en-CA", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    }).format(new Date(followUp.last_message_at))}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <a
                      href="https://business.facebook.com/latest/inbox/instagram"
                      target="_blank"
                      rel="noreferrer"
                      className="focus-ring border-violet/30 bg-violet/10 text-violet inline-flex min-h-10 items-center gap-2 rounded-xl border px-3.5 text-sm font-medium"
                    >
                      <MessageCircle size={16} aria-hidden="true" />
                      Open Instagram inbox
                    </a>
                    {relatedLead && (
                      <Link
                        href={`/admin/leads?lead=${relatedLead.id}`}
                        className="focus-ring border-border bg-elevated text-foreground inline-flex min-h-10 items-center gap-2 rounded-xl border px-3.5 text-sm"
                      >
                        <ClipboardList size={16} />
                        View inquiry
                      </Link>
                    )}
                    <ResolveFollowUpButton conversationId={followUp.id} />
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {totalPages > 1 && (
        <nav
          className="mt-5 flex items-center justify-between"
          aria-label="Follow-up pages"
        >
          <p className="text-muted text-xs">
            Page {Math.min(page, totalPages)} of {totalPages}
          </p>
          <div className="flex gap-2">
            <Link
              aria-disabled={page <= 1}
              href={`/admin/follow-ups?page=${Math.max(1, page - 1)}`}
              className={cn(
                "focus-ring border-border bg-surface inline-flex min-h-10 items-center gap-2 rounded-xl border px-3 text-sm",
                page <= 1 && "pointer-events-none opacity-40",
              )}
            >
              <ChevronLeft size={16} />
              Previous
            </Link>
            <Link
              aria-disabled={page >= totalPages}
              href={`/admin/follow-ups?page=${Math.min(totalPages, page + 1)}`}
              className={cn(
                "focus-ring border-border bg-surface inline-flex min-h-10 items-center gap-2 rounded-xl border px-3 text-sm",
                page >= totalPages && "pointer-events-none opacity-40",
              )}
            >
              Next
              <ChevronRight size={16} />
            </Link>
          </div>
        </nav>
      )}
    </AdminShell>
  );
}
