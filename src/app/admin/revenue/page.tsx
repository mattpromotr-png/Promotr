import { CalendarDays, CircleDollarSign, TrendingUp, Wine } from "lucide-react";
import { AdminShell } from "@/components/admin/admin-shell";
import { PageHeading } from "@/components/admin/page-heading";
import { RevenueForm } from "@/components/admin/revenue-form";
import { requireAdmin } from "@/lib/auth/admin";
import { createAdminClient } from "@/lib/supabase/admin";

export const metadata = { title: "Revenue" };
export const dynamic = "force-dynamic";
type RevenueLead = {
  id: string;
  name: string;
  bottle_preference: string | null;
  confirmed_revenue_cad: number | null;
  booked_at: string | null;
  requested_date: string;
};
const money = new Intl.NumberFormat("en-CA", {
  style: "currency",
  currency: "CAD",
});

export default async function RevenuePage() {
  await requireAdmin();
  const { data, error } = await createAdminClient()
    .from("leads")
    .select(
      "id,name,bottle_preference,confirmed_revenue_cad,booked_at,requested_date",
    )
    .eq("status", "booked")
    .eq("booking_type", "table")
    .order("booked_at", { ascending: false });
  if (error) throw new Error("Unable to load revenue.");
  const bookings = (data ?? []) as RevenueLead[];
  const now = new Date();
  const startToday = new Date(now);
  startToday.setHours(0, 0, 0, 0);
  const startWeek = new Date(startToday);
  startWeek.setDate(startToday.getDate() - 6);
  const startMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const sumSince = (date?: Date) =>
    bookings
      .filter(
        (item) => !date || (item.booked_at && new Date(item.booked_at) >= date),
      )
      .reduce((sum, item) => sum + Number(item.confirmed_revenue_cad || 0), 0);
  const metrics = [
    { label: "Today", value: sumSince(startToday), icon: CircleDollarSign },
    { label: "Last 7 days", value: sumSince(startWeek), icon: TrendingUp },
    { label: "This month", value: sumSince(startMonth), icon: CalendarDays },
    { label: "All confirmed", value: sumSince(), icon: Wine },
  ];
  const breakdown = Object.entries(
    bookings
      .filter((item) => item.confirmed_revenue_cad !== null)
      .reduce<Record<string, number>>((totals, item) => {
        const key = item.bottle_preference || "Not specified";
        totals[key] =
          (totals[key] || 0) + Number(item.confirmed_revenue_cad || 0);
        return totals;
      }, {}),
  ).sort((a, b) => b[1] - a[1]);

  return (
    <AdminShell active="revenue">
      <PageHeading
        eyebrow="CONFIRMED SALES"
        title="Bottle-service revenue"
        description="Revenue includes only staff-entered amounts for table inquiries marked Booked. Starting package prices are never treated as confirmed sales."
      />
      <section
        className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
        aria-label="Revenue totals"
      >
        {metrics.map(({ label, value, icon: Icon }) => (
          <article key={label} className="metric-card p-5">
            <span className="bg-violet/10 text-violet grid size-10 place-items-center rounded-xl">
              <Icon size={19} />
            </span>
            <p className="text-muted mt-5 text-sm">{label}</p>
            <p className="text-foreground mt-1 text-2xl font-semibold">
              {money.format(value)}
            </p>
          </article>
        ))}
      </section>
      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <section className="surface-card overflow-hidden">
          <div className="border-border border-b px-5 py-4">
            <h2 className="text-foreground font-semibold">
              Add or update revenue
            </h2>
            <p className="text-muted mt-1 text-xs">
              Booked table and bottle-service inquiries
            </p>
          </div>
          {bookings.length === 0 ? (
            <p className="text-muted p-8 text-center text-sm">
              No booked table inquiries are available yet. Mark a table inquiry
              as Booked first.
            </p>
          ) : (
            <div className="divide-border divide-y">
              {bookings.slice(0, 20).map((item) => (
                <div key={item.id} className="space-y-3 px-5 py-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-foreground text-sm font-medium">
                        {item.name}
                      </p>
                      <p className="text-muted mt-1 text-xs">
                        {item.bottle_preference ||
                          "Bottle preference not specified"}
                      </p>
                    </div>
                    <p className="text-muted shrink-0 text-xs">
                      {item.requested_date}
                    </p>
                  </div>
                  <RevenueForm
                    leadId={item.id}
                    amount={item.confirmed_revenue_cad}
                    enabled
                  />
                </div>
              ))}
            </div>
          )}
        </section>
        <section className="surface-card overflow-hidden">
          <div className="border-border border-b px-5 py-4">
            <h2 className="text-foreground font-semibold">Revenue breakdown</h2>
            <p className="text-muted mt-1 text-xs">
              By recorded bottle preference
            </p>
          </div>
          {breakdown.length === 0 ? (
            <p className="text-muted p-8 text-center text-sm">
              Revenue breakdown will appear here.
            </p>
          ) : (
            <div className="divide-border divide-y">
              {breakdown.map(([label, value]) => (
                <div
                  key={label}
                  className="flex items-center justify-between px-5 py-4"
                >
                  <p className="text-muted text-sm">{label}</p>
                  <p className="text-foreground font-semibold">
                    {money.format(value)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </AdminShell>
  );
}
