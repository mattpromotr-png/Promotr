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
  let query = createAdminClient()
    .from("leads")
    .select(
      "id,name,email,phone,instagram_handle,requested_date,preferred_arrival_time,party_size,occasion,booking_type,bottle_preference,notes,status,created_at,conversations(status,handoff_reason)",
    )
    .order("created_at", { ascending: false });
  if (filter !== "all") query = query.eq("status", filter);
  const { data, error } = await query;
  if (error) throw new Error("Unable to load leads.");
  const leads = (data ?? []) as unknown as Lead[];

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
