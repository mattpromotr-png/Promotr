import { CalendarCheck, CalendarDays, MapPinned, Users } from "lucide-react";
import Link from "next/link";

import { AdminShell } from "@/components/admin/admin-shell";
import { PageHeading } from "@/components/admin/page-heading";
import {
  reservationSource,
  selectedVenueDate,
} from "@/lib/admin/booking-views";
import { requireAdmin } from "@/lib/auth/admin";
import { createAdminClient } from "@/lib/supabase/admin";

export const metadata = { title: "Reservations" };
export const dynamic = "force-dynamic";

type TableBooking = {
  id: string;
  status: string;
  booking_date: string;
  club_tables: { name: string; code: string } | null;
};

type ReservationLead = {
  id: string;
  name: string;
  phone: string | null;
  instagram_handle: string | null;
  requested_date: string;
  preferred_arrival_time: string | null;
  party_size: number;
  booking_type: string;
  status: string;
  occasion: string | null;
  table_bookings: TableBooking | TableBooking[] | null;
};

type ConfirmedTableRow = TableBooking & {
  leads: Omit<ReservationLead, "table_bookings"> | null;
};

export default async function ReservationsPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  await requireAdmin();
  const params = await searchParams;
  const date = selectedVenueDate(params.date);
  const admin = createAdminClient();
  const venueResult = await admin
    .from("venues")
    .select("id")
    .eq("slug", "promotr-nightclub")
    .single();
  if (venueResult.error || !venueResult.data)
    throw new Error("Unable to identify the venue.");

  const [leadResult, tableResult] = await Promise.all([
    admin
      .from("leads")
      .select(
        "id,name,phone,instagram_handle,requested_date,preferred_arrival_time,party_size,booking_type,status,occasion,table_bookings(id,status,booking_date,club_tables(name,code))",
        { count: "exact" },
      )
      .eq("venue_id", venueResult.data.id)
      .eq("requested_date", date)
      .eq("status", "booked")
      .order("preferred_arrival_time", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: true }),
    admin
      .from("table_bookings")
      .select(
        "id,status,booking_date,club_tables(name,code),leads(id,name,phone,instagram_handle,requested_date,preferred_arrival_time,party_size,booking_type,status,occasion)",
      )
      .eq("venue_id", venueResult.data.id)
      .eq("booking_date", date)
      .eq("status", "confirmed"),
  ]);
  if (leadResult.error || tableResult.error)
    throw new Error("Unable to load reservations.");

  const leads = (leadResult.data ?? []) as unknown as ReservationLead[];
  const byLeadId = new Map(leads.map((lead) => [lead.id, lead]));
  for (const booking of (tableResult.data ??
    []) as unknown as ConfirmedTableRow[]) {
    if (booking.leads)
      byLeadId.set(booking.leads.id, {
        ...booking.leads,
        table_bookings: booking,
      });
  }
  const mergedLeads = [...byLeadId.values()].sort((a, b) =>
    (a.preferred_arrival_time ?? "99:99").localeCompare(
      b.preferred_arrival_time ?? "99:99",
    ),
  );
  const reservations = mergedLeads
    .map((lead) => ({ lead, source: reservationSource(lead) }))
    .filter(
      (row): row is { lead: ReservationLead; source: string } =>
        row.source !== null,
    );
  const tableCount = reservations.filter(
    ({ lead }) => lead.booking_type === "table",
  ).length;
  const guestListCount = reservations.filter(
    ({ lead }) => lead.booking_type === "guest_list",
  ).length;

  return (
    <AdminShell active="reservations">
      <PageHeading
        eyebrow="BOOKING OPERATIONS"
        title="Reservations"
        description="Staff-booked inquiries and confirmed table bookings for a selected date. Unconfirmed inquiries and cancelled, refunded, or held tables are excluded."
      />

      <div className="mt-5 grid gap-3 sm:grid-cols-3 xl:grid-cols-[minmax(0,1fr)_repeat(3,minmax(110px,auto))]">
        <form
          method="get"
          className="surface-card flex flex-wrap items-end gap-3 p-4 sm:col-span-3 xl:col-span-1"
        >
          <label className="text-foreground text-sm font-medium">
            <span className="flex items-center gap-2">
              <CalendarDays size={16} className="text-violet" />
              Reservation date
            </span>
            <input
              name="date"
              type="date"
              defaultValue={date}
              className="focus-ring border-border bg-elevated mt-2 min-h-10 rounded-xl border px-3"
            />
          </label>
          <button className="focus-ring bg-brand-gradient min-h-10 rounded-xl px-4 text-sm font-semibold text-white">
            View reservations
          </button>
        </form>
        <Metric label="Reservations" value={reservations.length} />
        <Metric label="Tables" value={tableCount} />
        <Metric label="Guest list" value={guestListCount} />
      </div>

      <section className="surface-card mt-4 overflow-hidden">
        <div className="border-border flex flex-wrap items-center justify-between gap-3 border-b px-4 py-4 sm:px-5">
          <div className="flex items-center gap-2">
            <CalendarCheck
              size={18}
              className="text-violet"
              aria-hidden="true"
            />
            <h2 className="text-foreground font-semibold">
              Confirmed for {date}
            </h2>
          </div>
          <Link
            href={`/admin/tables?date=${date}`}
            className="focus-ring border-border text-foreground hover:border-violet inline-flex min-h-9 items-center gap-2 rounded-lg border px-3 text-xs font-medium"
          >
            <MapPinned size={15} />
            View table map
          </Link>
        </div>
        {reservations.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <p className="text-foreground text-sm font-medium">
              No reservations for this date
            </p>
            <p className="text-muted mt-1 text-xs">
              New requests will appear in Inquiries until they are confirmed.
            </p>
            <Link
              href="/admin/leads"
              className="focus-ring text-violet mt-4 inline-flex text-sm font-medium"
            >
              Review inquiries
            </Link>
          </div>
        ) : (
          <div className="divide-border divide-y">
            {reservations.map(({ lead, source }) => {
              const booking = Array.isArray(lead.table_bookings)
                ? lead.table_bookings[0]
                : lead.table_bookings;
              return (
                <article
                  key={lead.id}
                  className="grid gap-3 px-4 py-4 sm:grid-cols-[minmax(150px,1.3fr)_minmax(110px,0.75fr)_minmax(90px,0.65fr)_minmax(125px,0.9fr)_auto] sm:items-center sm:px-5"
                >
                  <div className="min-w-0">
                    <p className="text-foreground truncate text-sm font-semibold">
                      {lead.name}
                    </p>
                    <p className="text-muted mt-0.5 truncate text-xs">
                      {lead.phone ||
                        lead.instagram_handle ||
                        lead.occasion ||
                        "No contact shown"}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted text-[11px]">Type</p>
                    <p className="text-foreground mt-0.5 text-sm capitalize">
                      {booking?.club_tables?.name ||
                        lead.booking_type.replaceAll("_", " ")}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted text-[11px]">Arrival</p>
                    <p className="text-foreground mt-0.5 text-sm">
                      {lead.preferred_arrival_time
                        ? lead.preferred_arrival_time.slice(0, 5)
                        : "Not specified"}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted text-[11px]">Party</p>
                    <p className="text-foreground mt-0.5 flex items-center gap-1 text-sm">
                      <Users size={13} aria-hidden="true" />
                      {lead.party_size} · {source}
                    </p>
                  </div>
                  <Link
                    href={`/admin/leads?lead=${lead.id}`}
                    className="focus-ring border-border text-foreground hover:border-violet inline-flex min-h-9 items-center justify-center rounded-lg border px-3 text-xs font-medium"
                  >
                    View booking
                  </Link>
                </article>
              );
            })}
          </div>
        )}
        {(leadResult.count ?? 0) > leads.length && (
          <p className="border-border text-muted border-t px-5 py-3 text-xs">
            This date has more records than can be shown here. Use Inquiries to
            review the complete list.
          </p>
        )}
      </section>
      <p className="text-muted mt-3 text-xs">
        A staff-marked table reservation without a confirmed deposit is labelled
        “Staff confirmed” so it cannot be mistaken for a paid booking.
      </p>
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
