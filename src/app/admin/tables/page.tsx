import { CalendarDays } from "lucide-react";
import { AdminShell } from "@/components/admin/admin-shell";
import { AdminTableMap } from "@/components/admin/admin-table-map";
import { PageHeading } from "@/components/admin/page-heading";
import type { FloorBooking } from "@/components/tables/club-floor-map";
import { tablePackages } from "@/config/table-packages";
import { requireAdmin } from "@/lib/auth/admin";
import { createAdminClient } from "@/lib/supabase/admin";

export const metadata = { title: "Table map" };
export const dynamic = "force-dynamic";

type Booking = {
  id: string;
  table_id: string;
  status: string;
  booking_date: string;
  leads: { id: string; name: string; party_size: number } | null;
};

export default async function TableMapPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  await requireAdmin();
  const params = await searchParams;
  const date = /^\d{4}-\d{2}-\d{2}$/.test(params.date || "")
    ? params.date!
    : new Date().toISOString().slice(0, 10);
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("table_bookings")
    .select("id,table_id,status,booking_date,leads(id,name,party_size)")
    .eq("booking_date", date)
    .in("status", ["held", "confirmed"]);
  if (error) throw new Error("Unable to load the table map.");

  const bookings = ((data ?? []) as unknown as Booking[]).map(
    (booking): FloorBooking => ({
      tableId: booking.table_id,
      status: booking.status,
      leadId: booking.leads?.id,
      guestName: booking.leads?.name,
      partySize: booking.leads?.party_size,
    }),
  );
  const confirmed = bookings.filter(
    (booking) => booking.status === "confirmed",
  ).length;
  const held = bookings.filter((booking) => booking.status === "held").length;

  return (
    <AdminShell active="tables">
      <PageHeading
        eyebrow="FLOOR OPERATIONS"
        title="Table map"
        description="See table availability, payment holds, and confirmed bookings for any date. Hover over a table for its package details."
      />
      <div className="mt-5 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto_auto_auto]">
        <form
          className="surface-card flex flex-wrap items-end gap-3 p-3"
          method="get"
        >
          <label className="text-foreground text-sm font-medium">
            <span className="flex items-center gap-2">
              <CalendarDays size={16} className="text-violet" />
              Booking date
            </span>
            <input
              name="date"
              type="date"
              defaultValue={date}
              className="focus-ring border-border bg-elevated mt-2 min-h-10 rounded-xl border px-3"
            />
          </label>
          <button className="focus-ring bg-brand-gradient min-h-10 rounded-xl px-4 text-sm font-semibold text-white">
            View availability
          </button>
        </form>
        <Metric
          label="Available"
          value={tablePackages.length - bookings.length}
          tone="text-white"
        />
        <Metric label="Payment holds" value={held} tone="text-amber-300" />
        <Metric label="Confirmed" value={confirmed} tone="text-emerald-300" />
      </div>
      <section className="surface-card mt-4 p-3 sm:p-4">
        <AdminTableMap tables={tablePackages} bookings={bookings} />
      </section>
    </AdminShell>
  );
}

function Metric({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: string;
}) {
  return (
    <div className="surface-card min-w-28 p-3">
      <p className="text-muted text-xs">{label}</p>
      <p className={`mt-0.5 text-xl font-bold ${tone}`}>{value}</p>
    </div>
  );
}
