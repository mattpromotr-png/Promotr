import { CalendarDays, Users } from "lucide-react";
import { AdminShell } from "@/components/admin/admin-shell";
import { PageHeading } from "@/components/admin/page-heading";
import { requireAdmin } from "@/lib/auth/admin";
import { createAdminClient } from "@/lib/supabase/admin";

export const metadata = { title: "Table map" };
export const dynamic = "force-dynamic";
type ClubTable = {
  id: string;
  code: string;
  name: string;
  zone: string;
  capacity: number;
  minimum_spend_cad: number;
  deposit_cad: number;
  map_x: number;
  map_y: number;
};
type Booking = {
  id: string;
  table_id: string;
  status: string;
  booking_date: string;
  leads: { name: string; party_size: number } | null;
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
  const [tablesResult, bookingsResult] = await Promise.all([
    admin
      .from("club_tables")
      .select(
        "id,code,name,zone,capacity,minimum_spend_cad,deposit_cad,map_x,map_y",
      )
      .eq("active", true)
      .order("code"),
    admin
      .from("table_bookings")
      .select("id,table_id,status,booking_date,leads(name,party_size)")
      .eq("booking_date", date)
      .in("status", ["held", "confirmed"]),
  ]);
  if (tablesResult.error || bookingsResult.error)
    throw new Error("Unable to load the table map.");
  const tables = (tablesResult.data ?? []) as ClubTable[];
  const bookings = (bookingsResult.data ?? []) as unknown as Booking[];
  return (
    <AdminShell active="tables">
      <PageHeading
        eyebrow="FLOOR OPERATIONS"
        title="Table map"
        description="Select a date to see current table holds and confirmed bookings. The database prevents two active bookings for the same table and date."
      />
      <form
        className="surface-card mt-8 flex flex-wrap items-end gap-3 p-4"
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
      <section className="surface-card mt-5 p-4 sm:p-6">
        <div className="border-border relative mx-auto aspect-[16/10] max-w-5xl overflow-hidden rounded-2xl border bg-[#080a12]">
          <div className="bg-violet/25 absolute top-4 left-1/2 -translate-x-1/2 rounded-xl px-8 py-3 text-xs font-bold tracking-widest text-violet-200">
            DJ BOOTH
          </div>
          <div className="border-violet/20 bg-violet/5 absolute inset-x-[27%] top-[22%] bottom-[12%] grid place-items-center rounded-[3rem] border text-xs tracking-[.2em] text-white/25">
            DANCE FLOOR
          </div>
          {tables.map((table) => {
            const booking = bookings.find((item) => item.table_id === table.id);
            return (
              <div
                key={table.id}
                style={{ left: `${table.map_x}%`, top: `${table.map_y}%` }}
                className={`absolute w-20 -translate-x-1/2 rounded-2xl border p-2 text-center shadow-xl sm:w-28 ${booking?.status === "confirmed" ? "border-emerald-400/40 bg-emerald-500/20 text-emerald-200" : booking ? "border-amber-400/40 bg-amber-500/20 text-amber-100" : "border-white/20 bg-white/10 text-white"}`}
              >
                <p className="font-bold">{table.code}</p>
                <p className="mt-1 truncate text-[10px]">
                  {booking?.leads?.name || "Available"}
                </p>
                <p className="mt-1 flex items-center justify-center gap-1 text-[10px] opacity-70">
                  <Users size={10} />
                  {booking?.leads?.party_size || table.capacity}
                </p>
              </div>
            );
          })}
        </div>
        <div className="mt-4 flex flex-wrap gap-4 text-xs">
          <span className="text-white/70">● Available</span>
          <span className="text-amber-400">● Payment hold</span>
          <span className="text-emerald-400">● Confirmed</span>
        </div>
      </section>
    </AdminShell>
  );
}
