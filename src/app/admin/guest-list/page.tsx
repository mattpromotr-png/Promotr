import { CalendarDays, ChevronLeft, ChevronRight, Users } from "lucide-react";
import Link from "next/link";

import { AdminShell } from "@/components/admin/admin-shell";
import { PageHeading } from "@/components/admin/page-heading";
import { selectedVenueDate } from "@/lib/admin/booking-views";
import { requireAdmin } from "@/lib/auth/admin";
import { createAdminClient } from "@/lib/supabase/admin";

export const metadata = { title: "Guest List" };
export const dynamic = "force-dynamic";
const PAGE_SIZE = 30;

type GuestListEntry = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  instagram_handle: string | null;
  requested_date: string;
  preferred_arrival_time: string | null;
  party_size: number;
  occasion: string | null;
  status: string;
};

type View = "all" | "confirmed" | "unconfirmed";

function listHref(date: string, view: View, page = 1) {
  const params = new URLSearchParams({ date });
  if (view !== "all") params.set("view", view);
  if (page > 1) params.set("page", String(page));
  return `/admin/guest-list?${params}`;
}

export default async function GuestListPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; view?: string; page?: string }>;
}) {
  await requireAdmin();
  const params = await searchParams;
  const date = selectedVenueDate(params.date);
  const view: View =
    params.view === "confirmed" || params.view === "unconfirmed"
      ? params.view
      : "all";
  const requestedPage = Number.parseInt(params.page ?? "1", 10);
  const page =
    Number.isFinite(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  const admin = createAdminClient();
  const venueResult = await admin
    .from("venues")
    .select("id")
    .eq("slug", "promotr-nightclub")
    .single();
  if (venueResult.error || !venueResult.data)
    throw new Error("Unable to identify the venue.");
  const venueId = venueResult.data.id;

  let entriesQuery = admin
    .from("leads")
    .select(
      "id,name,phone,email,instagram_handle,requested_date,preferred_arrival_time,party_size,occasion,status",
      { count: "exact" },
    )
    .eq("venue_id", venueId)
    .eq("booking_type", "guest_list")
    .eq("requested_date", date);
  if (view === "confirmed") entriesQuery = entriesQuery.eq("status", "booked");
  if (view === "unconfirmed")
    entriesQuery = entriesQuery.neq("status", "booked");

  const [entriesResult, allResult, confirmedResult] = await Promise.all([
    entriesQuery
      .order("preferred_arrival_time", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: true })
      .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1),
    admin
      .from("leads")
      .select("id", { count: "exact", head: true })
      .eq("venue_id", venueId)
      .eq("booking_type", "guest_list")
      .eq("requested_date", date),
    admin
      .from("leads")
      .select("id", { count: "exact", head: true })
      .eq("venue_id", venueId)
      .eq("booking_type", "guest_list")
      .eq("requested_date", date)
      .eq("status", "booked"),
  ]);
  if (entriesResult.error || allResult.error || confirmedResult.error) {
    throw new Error("Unable to load the guest list.");
  }

  const entries = (entriesResult.data ?? []) as GuestListEntry[];
  const total = allResult.count ?? 0;
  const confirmed = confirmedResult.count ?? 0;
  const totalPages = Math.max(
    1,
    Math.ceil((entriesResult.count ?? 0) / PAGE_SIZE),
  );

  return (
    <AdminShell active="guest-list">
      <PageHeading
        eyebrow="DOOR OPERATIONS"
        title="Guest List"
        description="Guest-list requests for a selected date. Only entries marked Booked by staff are confirmed; entry remains subject to venue policy."
      />

      <div className="mt-5 grid gap-3 sm:grid-cols-3 xl:grid-cols-[minmax(0,1fr)_repeat(3,minmax(110px,auto))]">
        <form
          method="get"
          className="surface-card flex flex-wrap items-end gap-3 p-4 sm:col-span-3 xl:col-span-1"
        >
          {view !== "all" && <input type="hidden" name="view" value={view} />}
          <label className="text-foreground text-sm font-medium">
            <span className="flex items-center gap-2">
              <CalendarDays size={16} className="text-violet" />
              Guest-list date
            </span>
            <input
              name="date"
              type="date"
              defaultValue={date}
              className="focus-ring border-border bg-elevated mt-2 min-h-10 rounded-xl border px-3"
            />
          </label>
          <button className="focus-ring bg-brand-gradient min-h-10 rounded-xl px-4 text-sm font-semibold text-white">
            View list
          </button>
        </form>
        <Metric label="Requests" value={total} />
        <Metric label="Confirmed" value={confirmed} />
        <Metric label="Needs confirmation" value={total - confirmed} />
      </div>

      <section className="surface-card mt-4 overflow-hidden">
        <div className="border-border flex flex-wrap items-center justify-between gap-3 border-b px-4 py-4 sm:px-5">
          <div className="flex items-center gap-2">
            <Users size={18} className="text-violet" aria-hidden="true" />
            <h2 className="text-foreground font-semibold">
              Entries for {date}
            </h2>
          </div>
          <nav className="flex flex-wrap gap-1" aria-label="Guest-list status">
            {(
              [
                ["all", "All"],
                ["confirmed", "Confirmed"],
                ["unconfirmed", "Needs confirmation"],
              ] as const
            ).map(([value, label]) => (
              <Link
                key={value}
                href={listHref(date, value)}
                aria-current={view === value ? "page" : undefined}
                className={`focus-ring rounded-lg px-3 py-2 text-xs font-medium ${view === value ? "bg-violet/20 text-foreground" : "text-muted hover:bg-elevated hover:text-foreground"}`}
              >
                {label}
              </Link>
            ))}
          </nav>
        </div>
        {entries.length === 0 ? (
          <p className="text-muted px-5 py-12 text-center text-sm">
            No guest-list{" "}
            {view === "all"
              ? "requests"
              : view === "confirmed"
                ? "confirmations"
                : "requests awaiting confirmation"}{" "}
            for this date.
          </p>
        ) : (
          <div className="divide-border divide-y">
            {entries.map((entry) => (
              <article
                key={entry.id}
                className="grid gap-3 px-4 py-4 sm:grid-cols-[minmax(150px,1.4fr)_minmax(110px,0.75fr)_minmax(90px,0.6fr)_minmax(120px,0.85fr)_auto] sm:items-center sm:px-5"
              >
                <div className="min-w-0">
                  <p className="text-foreground truncate text-sm font-semibold">
                    {entry.name}
                  </p>
                  <p className="text-muted mt-0.5 truncate text-xs">
                    {entry.phone ||
                      entry.instagram_handle ||
                      entry.email ||
                      "No contact shown"}
                  </p>
                </div>
                <div>
                  <p className="text-muted text-[11px]">Arrival</p>
                  <p className="text-foreground mt-0.5 text-sm">
                    {entry.preferred_arrival_time
                      ? entry.preferred_arrival_time.slice(0, 5)
                      : "Not specified"}
                  </p>
                </div>
                <div>
                  <p className="text-muted text-[11px]">Party</p>
                  <p className="text-foreground mt-0.5 text-sm">
                    {entry.party_size}{" "}
                    {entry.party_size === 1 ? "guest" : "guests"}
                  </p>
                </div>
                <div>
                  <p className="text-muted text-[11px]">Status</p>
                  <span
                    className={`mt-0.5 inline-flex rounded-full px-2 py-1 text-xs font-medium ${entry.status === "booked" ? "bg-emerald-500/15 text-emerald-300" : "bg-violet/15 text-violet"}`}
                  >
                    {entry.status === "booked"
                      ? "Confirmed"
                      : entry.status.replaceAll("_", " ")}
                  </span>
                  {entry.occasion && (
                    <p className="text-muted mt-1 truncate text-xs">
                      {entry.occasion}
                    </p>
                  )}
                </div>
                <Link
                  href={`/admin/leads?lead=${entry.id}`}
                  className="focus-ring border-border text-foreground hover:border-violet inline-flex min-h-9 items-center justify-center rounded-lg border px-3 text-xs font-medium"
                >
                  View inquiry
                </Link>
              </article>
            ))}
          </div>
        )}
        {totalPages > 1 && (
          <nav
            aria-label="Guest-list pages"
            className="border-border flex items-center justify-between gap-3 border-t px-4 py-3 text-xs sm:px-5"
          >
            <Link
              href={listHref(date, view, Math.max(1, page - 1))}
              aria-disabled={page <= 1}
              className={`focus-ring border-border inline-flex min-h-9 items-center gap-1 rounded-lg border px-3 ${page <= 1 ? "pointer-events-none opacity-40" : "text-foreground"}`}
            >
              <ChevronLeft size={14} />
              Previous
            </Link>
            <span className="text-muted">
              Page {page} of {totalPages}
            </span>
            <Link
              href={listHref(date, view, Math.min(totalPages, page + 1))}
              aria-disabled={page >= totalPages}
              className={`focus-ring border-border inline-flex min-h-9 items-center gap-1 rounded-lg border px-3 ${page >= totalPages ? "pointer-events-none opacity-40" : "text-foreground"}`}
            >
              Next
              <ChevronRight size={14} />
            </Link>
          </nav>
        )}
      </section>
    </AdminShell>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="surface-card flex min-h-20 flex-col justify-center px-4 py-3">
      <p className="text-muted text-xs">{label}</p>
      <p className="text-foreground mt-1 text-xl font-semibold">{value}</p>
    </div>
  );
}
