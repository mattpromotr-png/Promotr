import {
  AlertTriangle,
  CalendarDays,
  LogOut,
  Mail,
  Phone,
  Users,
} from "lucide-react";
import Link from "next/link";
import { Brand } from "@/components/brand";
import { ThemeToggle } from "@/components/theme-toggle";
import { requireAdmin } from "@/lib/auth/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { signOut } from "../login/actions";
import { updateLeadStatus } from "./actions";

const filters = ["all", "new", "contacted", "qualified", "closed"] as const;
type Filter = (typeof filters)[number];
type Lead = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  instagram_handle: string | null;
  requested_date: string;
  preferred_arrival_time: string | null;
  party_size: number;
  occasion: string | null;
  booking_type: "guest_list" | "table" | "unsure";
  bottle_preference: string | null;
  notes: string | null;
  status: "new" | "contacted" | "qualified" | "closed";
  created_at: string;
  conversations: { status: string; handoff_reason: string | null } | null;
};
type HandoffConversation = {
  id: string;
  handoff_reason: string | null;
  last_message_at: string;
  contacts: {
    display_name: string | null;
    instagram_scoped_id: string;
  } | null;
};

export const metadata = { title: "Leads" };
export const dynamic = "force-dynamic";

export default async function AdminLeadsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  await requireAdmin();
  const rawFilter = (await searchParams).status;
  const filter: Filter = filters.includes(rawFilter as Filter)
    ? (rawFilter as Filter)
    : "all";
  const admin = createAdminClient();
  let query = admin
    .from("leads")
    .select(
      "id,name,email,phone,instagram_handle,requested_date,preferred_arrival_time,party_size,occasion,booking_type,bottle_preference,notes,status,created_at,conversations(status,handoff_reason)",
    )
    .order("created_at", { ascending: false });
  if (filter !== "all") query = query.eq("status", filter);
  const [leadResult, handoffResult] = await Promise.all([
    query,
    admin
      .from("conversations")
      .select(
        "id,handoff_reason,last_message_at,contacts(display_name,instagram_scoped_id)",
      )
      .eq("status", "handoff_required")
      .order("last_message_at", { ascending: false }),
  ]);
  if (leadResult.error || handoffResult.error)
    throw new Error("Unable to load the admin view.");
  const leads = (leadResult.data ?? []) as unknown as Lead[];
  const handoffs = (handoffResult.data ??
    []) as unknown as HandoffConversation[];

  return (
    <main className="min-h-svh px-4 py-5 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="border-border flex flex-wrap items-center justify-between gap-4 border-b pb-5">
          <Brand compact />
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <form action={signOut}>
              <button
                className="focus-ring border-border bg-surface text-muted inline-flex min-h-10 items-center gap-2 rounded-xl border px-3 text-sm"
                type="submit"
              >
                <LogOut size={16} aria-hidden="true" />
                Sign out
              </button>
            </form>
          </div>
        </header>
        <div className="py-8">
          <p className="eyebrow">DEMO ADMIN</p>
          <h1 className="text-foreground mt-2 text-3xl font-semibold">
            Booking inquiries
          </h1>
          <p className="text-muted mt-2 text-sm">
            Newest inquiries appear first. A status update does not confirm a
            reservation.
          </p>
          <section className="mt-7" aria-labelledby="handoff-heading">
            <div className="flex items-center gap-2">
              <AlertTriangle
                className="text-amber-300"
                size={18}
                aria-hidden="true"
              />
              <h2
                id="handoff-heading"
                className="text-foreground text-lg font-semibold"
              >
                Human follow-up
              </h2>
              <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-300">
                {handoffs.length}
              </span>
            </div>
            {handoffs.length === 0 ? (
              <p className="text-muted border-border bg-surface mt-3 rounded-xl border p-4 text-sm">
                No conversations currently require human follow-up.
              </p>
            ) : (
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                {handoffs.map((handoff) => (
                  <article
                    key={handoff.id}
                    className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-foreground font-medium">
                          {handoff.contacts?.display_name || "Instagram guest"}
                        </h3>
                        <p className="text-muted mt-1 text-xs">
                          Contact …
                          {handoff.contacts?.instagram_scoped_id.slice(-4) ||
                            "unknown"}
                        </p>
                      </div>
                      <time
                        className="text-muted text-xs"
                        dateTime={handoff.last_message_at}
                      >
                        {new Intl.DateTimeFormat("en-CA", {
                          dateStyle: "medium",
                          timeStyle: "short",
                        }).format(new Date(handoff.last_message_at))}
                      </time>
                    </div>
                    <p className="mt-3 text-sm leading-6 text-amber-900 dark:text-amber-100/90">
                      {handoff.handoff_reason ||
                        "The AI requested human follow-up."}
                    </p>
                  </article>
                ))}
              </div>
            )}
          </section>
          <nav
            className="mt-6 flex gap-2 overflow-x-auto pb-2"
            aria-label="Filter leads by status"
          >
            {filters.map((status) => (
              <Link
                key={status}
                href={
                  status === "all"
                    ? "/admin/leads"
                    : `/admin/leads?status=${status}`
                }
                className={`focus-ring rounded-xl border px-3.5 py-2 text-sm whitespace-nowrap capitalize ${filter === status ? "border-violet bg-violet/10 text-foreground" : "border-border bg-surface text-muted"}`}
              >
                {status}
              </Link>
            ))}
          </nav>
          {leads.length === 0 ? (
            <div className="surface-card text-muted mt-5 p-10 text-center">
              No {filter === "all" ? "" : `${filter} `}inquiries yet.
            </div>
          ) : (
            <div className="mt-5 grid gap-4">
              {leads.map((lead) => {
                const handoff =
                  lead.conversations?.status === "handoff_required";
                return (
                  <article key={lead.id} className="surface-card p-5 sm:p-6">
                    <div className="flex flex-col justify-between gap-4 lg:flex-row">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="text-foreground text-lg font-semibold">
                            {lead.name}
                          </h2>
                          <span className="border-border bg-elevated text-muted rounded-full border px-2.5 py-1 text-xs capitalize">
                            {lead.booking_type.replace("_", " ")}
                          </span>
                          {handoff && (
                            <span className="flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-xs text-amber-300">
                              <AlertTriangle size={13} />
                              Handoff required
                            </span>
                          )}
                        </div>
                        <div className="text-muted mt-4 grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-4">
                          <span className="flex items-center gap-2">
                            <CalendarDays size={16} className="text-violet" />
                            {lead.requested_date}
                            {lead.preferred_arrival_time
                              ? ` · ${lead.preferred_arrival_time.slice(0, 5)}`
                              : ""}
                          </span>
                          <span className="flex items-center gap-2">
                            <Users size={16} className="text-violet" />
                            {lead.party_size} guests
                          </span>
                          {lead.email && (
                            <a
                              className="flex items-center gap-2 truncate"
                              href={`mailto:${lead.email}`}
                            >
                              <Mail size={16} className="text-violet" />
                              {lead.email}
                            </a>
                          )}
                          {lead.phone && (
                            <a
                              className="flex items-center gap-2"
                              href={`tel:${lead.phone}`}
                            >
                              <Phone size={16} className="text-violet" />
                              {lead.phone}
                            </a>
                          )}
                        </div>
                        {(lead.occasion ||
                          lead.bottle_preference ||
                          lead.notes ||
                          handoff) && (
                          <div className="text-muted mt-4 space-y-1 text-sm">
                            {lead.occasion && (
                              <p>
                                <strong className="text-foreground">
                                  Occasion:
                                </strong>{" "}
                                {lead.occasion}
                              </p>
                            )}
                            {lead.bottle_preference && (
                              <p>
                                <strong className="text-foreground">
                                  Bottle:
                                </strong>{" "}
                                {lead.bottle_preference}
                              </p>
                            )}
                            {lead.notes && (
                              <p>
                                <strong className="text-foreground">
                                  Notes:
                                </strong>{" "}
                                {lead.notes}
                              </p>
                            )}
                            {handoff && lead.conversations?.handoff_reason && (
                              <p>
                                <strong className="text-amber-300">
                                  Handoff:
                                </strong>{" "}
                                {lead.conversations.handoff_reason}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                      <form
                        action={updateLeadStatus}
                        className="flex items-end gap-2 lg:w-64"
                      >
                        <input type="hidden" name="leadId" value={lead.id} />
                        <label className="text-muted w-full text-xs font-medium tracking-wider uppercase">
                          Status
                          <select
                            name="status"
                            defaultValue={lead.status}
                            className="focus-ring border-border bg-elevated text-foreground mt-2 min-h-11 w-full rounded-xl border px-3 text-sm capitalize"
                          >
                            {filters.slice(1).map((status) => (
                              <option key={status} value={status}>
                                {status}
                              </option>
                            ))}
                          </select>
                        </label>
                        <button
                          className="focus-ring border-border bg-elevated text-foreground min-h-11 rounded-xl border px-3 text-sm font-medium"
                          type="submit"
                        >
                          Save
                        </button>
                      </form>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
