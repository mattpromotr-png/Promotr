import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  TrendingUp,
  Wine,
} from "lucide-react";
import Link from "next/link";
import { AdminShell } from "@/components/admin/admin-shell";
import { PageHeading } from "@/components/admin/page-heading";
import { RevenueForm } from "@/components/admin/revenue-form";
import { requireAdmin } from "@/lib/auth/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { cn } from "@/lib/utils";

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
type DepositRecord = {
  id: string;
  deposit_cad: number;
  paid_at: string | null;
  status: string;
  stripe_payment_intent_id: string | null;
  booking_date: string;
  club_tables: { code: string; name: string; zone: string } | null;
  leads: { name: string; email: string | null } | null;
};
const money = new Intl.NumberFormat("en-CA", {
  style: "currency",
  currency: "CAD",
});
const DEPOSIT_PAGE_SIZE = 20;
const SALES_PAGE_SIZE = 5;

export default async function RevenuePage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; salesPage?: string; date?: string }>;
}) {
  await requireAdmin();
  const params = await searchParams;
  const selectedDate = /^\d{4}-\d{2}-\d{2}$/.test(params.date ?? "")
    ? params.date!
    : new Intl.DateTimeFormat("en-CA", {
        timeZone: "America/Toronto",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(new Date());
  const requestedPage = Number.parseInt(params.page ?? "1", 10);
  const page =
    Number.isFinite(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  const requestedSalesPage = Number.parseInt(params.salesPage ?? "1", 10);
  const salesPage =
    Number.isFinite(requestedSalesPage) && requestedSalesPage > 0
      ? requestedSalesPage
      : 1;
  const admin = createAdminClient();
  const [{ data, error }, depositTotalsResult, depositResult] =
    await Promise.all([
      admin
        .from("leads")
        .select(
          "id,name,bottle_preference,confirmed_revenue_cad,booked_at,requested_date",
        )
        .eq("status", "booked")
        .eq("booking_type", "table")
        .order("booked_at", { ascending: false }),
      admin
        .from("table_bookings")
        .select("deposit_cad,paid_at,status")
        .not("paid_at", "is", null),
      admin
        .from("table_bookings")
        .select(
          "id,deposit_cad,paid_at,status,stripe_payment_intent_id,booking_date,club_tables(code,name,zone),leads(name,email)",
          { count: "exact" },
        )
        .not("paid_at", "is", null)
        .order("paid_at", { ascending: false })
        .range((page - 1) * DEPOSIT_PAGE_SIZE, page * DEPOSIT_PAGE_SIZE - 1),
    ]);
  if (error || depositResult.error || depositTotalsResult.error)
    throw new Error("Unable to load revenue.");
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
  const deposits = (depositResult.data ?? []) as unknown as DepositRecord[];
  const confirmedDeposits = (depositTotalsResult.data ?? []).filter(
    (item) => item.status === "confirmed",
  );
  const depositTotal = depositResult.count ?? 0;
  const depositTotalPages = Math.max(
    1,
    Math.ceil(depositTotal / DEPOSIT_PAGE_SIZE),
  );
  const depositSum = (date?: Date) =>
    confirmedDeposits
      .filter(
        (item) => !date || (item.paid_at && new Date(item.paid_at) >= date),
      )
      .reduce((sum, item) => sum + Number(item.deposit_cad || 0), 0);
  const paymentDate = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Toronto",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const selectedDateDeposits = confirmedDeposits.filter(
    (item) =>
      item.paid_at &&
      paymentDate.format(new Date(item.paid_at)) === selectedDate,
  );
  const selectedDateTotal = selectedDateDeposits.reduce(
    (sum, item) => sum + Number(item.deposit_cad || 0),
    0,
  );
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
  const salesTotalPages = Math.max(
    1,
    Math.ceil(bookings.length / SALES_PAGE_SIZE),
  );
  const visibleBookings = bookings.slice(
    (salesPage - 1) * SALES_PAGE_SIZE,
    salesPage * SALES_PAGE_SIZE,
  );

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
      <section className="surface-card mt-6 p-5 sm:p-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="eyebrow">STRIPE DEPOSITS</p>
            <h2 className="text-foreground mt-2 text-xl font-semibold">
              Deposits received
            </h2>
            <p className="text-muted mt-1 text-xs">
              Updated only by verified successful payment events.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-5 text-right sm:grid-cols-3">
            <div>
              <p className="text-muted text-xs">Today</p>
              <p className="text-foreground mt-1 font-semibold">
                {money.format(depositSum(startToday))}
              </p>
            </div>
            <div>
              <p className="text-muted text-xs">This month</p>
              <p className="text-foreground mt-1 font-semibold">
                {money.format(depositSum(startMonth))}
              </p>
            </div>
            <div>
              <p className="text-muted text-xs">All time</p>
              <p className="text-foreground mt-1 font-semibold">
                {money.format(depositSum())}
              </p>
            </div>
          </div>
        </div>
        <form
          method="get"
          className="border-border bg-elevated mt-5 flex flex-col gap-3 rounded-2xl border p-4 sm:flex-row sm:items-end sm:justify-between"
        >
          <input type="hidden" name="page" value="1" />
          <input type="hidden" name="salesPage" value={salesPage} />
          <label className="text-foreground text-sm font-medium">
            <span className="flex items-center gap-2">
              <CalendarDays size={16} className="text-violet" /> Payment date
            </span>
            <input
              type="date"
              name="date"
              defaultValue={selectedDate}
              className="focus-ring border-border bg-surface mt-2 min-h-10 rounded-xl border px-3"
            />
          </label>
          <div className="flex flex-wrap items-end gap-3 sm:justify-end">
            <div className="text-right">
              <p className="text-muted text-xs">Received on {selectedDate}</p>
              <p className="text-foreground mt-1 text-xl font-semibold">
                {money.format(selectedDateTotal)}
              </p>
              <p className="text-muted mt-1 text-[11px]">
                {selectedDateDeposits.length} confirmed payment
                {selectedDateDeposits.length === 1 ? "" : "s"}
              </p>
            </div>
            <button className="focus-ring bg-brand-gradient min-h-10 rounded-xl px-4 text-sm font-semibold text-white">
              View day
            </button>
          </div>
        </form>
      </section>
      <section className="surface-card mt-6 overflow-hidden">
        <div className="border-border border-b px-5 py-4 sm:px-6">
          <h2 className="text-foreground font-semibold">
            Deposit transactions
          </h2>
          <p className="text-muted mt-1 text-xs">
            Verified Stripe payments, including later refunds. Showing 20 per
            page.
          </p>
        </div>
        {deposits.length === 0 ? (
          <p className="text-muted p-8 text-center text-sm">
            No deposit payments yet.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="text-muted bg-elevated/60 text-xs tracking-wide uppercase">
                <tr>
                  <th className="px-5 py-3 font-medium">Guest</th>
                  <th className="px-5 py-3 font-medium">Table</th>
                  <th className="px-5 py-3 font-medium">Booking date</th>
                  <th className="px-5 py-3 font-medium">Paid</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 text-right font-medium">Deposit</th>
                </tr>
              </thead>
              <tbody className="divide-border divide-y">
                {deposits.map((deposit) => (
                  <tr key={deposit.id} className="hover:bg-elevated/35">
                    <td className="px-5 py-4">
                      <p className="text-foreground font-medium">
                        {deposit.leads?.name ?? "Guest"}
                      </p>
                      <p className="text-muted mt-1 text-xs">
                        {deposit.leads?.email ?? "No email"}
                      </p>
                    </td>
                    <td className="px-5 py-4">
                      <p className="text-foreground">
                        {deposit.club_tables?.name ?? "Table"}
                      </p>
                      <p className="text-muted mt-1 text-xs">
                        {deposit.club_tables?.zone ?? "Venue"}
                      </p>
                    </td>
                    <td className="text-muted px-5 py-4">
                      {deposit.booking_date}
                    </td>
                    <td className="text-muted px-5 py-4">
                      {deposit.paid_at
                        ? new Intl.DateTimeFormat("en-CA", {
                            dateStyle: "medium",
                            timeStyle: "short",
                          }).format(new Date(deposit.paid_at))
                        : "—"}
                      {deposit.stripe_payment_intent_id && (
                        <p className="mt-1 font-mono text-[10px]">
                          …{deposit.stripe_payment_intent_id.slice(-8)}
                        </p>
                      )}
                    </td>
                    <td className="px-5 py-4 capitalize">
                      <span
                        className={
                          deposit.status === "confirmed"
                            ? "text-emerald-300"
                            : "text-amber-300"
                        }
                      >
                        {deposit.status}
                      </span>
                    </td>
                    <td className="text-foreground px-5 py-4 text-right font-semibold">
                      {money.format(Number(deposit.deposit_cad || 0))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {depositTotalPages > 1 && (
          <nav
            className="border-border flex items-center justify-between gap-4 border-t px-5 py-4"
            aria-label="Deposit transaction pages"
          >
            <p className="text-muted text-xs">
              Page {Math.min(page, depositTotalPages)} of {depositTotalPages} ·{" "}
              {depositTotal} transactions
            </p>
            <div className="flex gap-2">
              <Link
                href={`/admin/revenue?page=${Math.max(1, page - 1)}&salesPage=${salesPage}&date=${selectedDate}`}
                aria-disabled={page <= 1}
                tabIndex={page <= 1 ? -1 : undefined}
                className={cn(
                  "focus-ring border-border bg-elevated inline-flex min-h-10 items-center gap-2 rounded-xl border px-3 text-sm",
                  page <= 1
                    ? "pointer-events-none opacity-40"
                    : "text-foreground",
                )}
              >
                <ChevronLeft size={16} /> Previous
              </Link>
              <Link
                href={`/admin/revenue?page=${Math.min(depositTotalPages, page + 1)}&salesPage=${salesPage}&date=${selectedDate}`}
                aria-disabled={page >= depositTotalPages}
                tabIndex={page >= depositTotalPages ? -1 : undefined}
                className={cn(
                  "focus-ring border-border bg-elevated inline-flex min-h-10 items-center gap-2 rounded-xl border px-3 text-sm",
                  page >= depositTotalPages
                    ? "pointer-events-none opacity-40"
                    : "text-foreground",
                )}
              >
                Next <ChevronRight size={16} />
              </Link>
            </div>
          </nav>
        )}
      </section>
      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <section className="surface-card overflow-hidden">
          <div className="border-border border-b px-5 py-4">
            <h2 className="text-foreground font-semibold">
              Add or update revenue
            </h2>
            <p className="text-muted mt-1 text-xs">
              Booked table and bottle-service inquiries · 5 per page
            </p>
          </div>
          {bookings.length === 0 ? (
            <p className="text-muted p-8 text-center text-sm">
              No booked table inquiries are available yet. Mark a table inquiry
              as Booked first.
            </p>
          ) : (
            <div className="divide-border divide-y">
              {visibleBookings.map((item) => (
                <div key={item.id} className="space-y-2 px-4 py-3">
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
          {salesTotalPages > 1 && (
            <nav
              className="border-border flex items-center justify-between gap-3 border-t px-5 py-4"
              aria-label="Recorded revenue pages"
            >
              <p className="text-muted text-xs">
                Page {Math.min(salesPage, salesTotalPages)} of {salesTotalPages}
              </p>
              <div className="flex gap-2">
                <Link
                  href={`/admin/revenue?page=${page}&salesPage=${Math.max(1, salesPage - 1)}&date=${selectedDate}`}
                  aria-disabled={salesPage <= 1}
                  className={cn(
                    "focus-ring border-border bg-elevated grid size-9 place-items-center rounded-xl border",
                    salesPage <= 1
                      ? "pointer-events-none opacity-40"
                      : "text-foreground",
                  )}
                  aria-label="Previous recorded revenue page"
                >
                  <ChevronLeft size={16} />
                </Link>
                <Link
                  href={`/admin/revenue?page=${page}&salesPage=${Math.min(salesTotalPages, salesPage + 1)}&date=${selectedDate}`}
                  aria-disabled={salesPage >= salesTotalPages}
                  className={cn(
                    "focus-ring border-border bg-elevated grid size-9 place-items-center rounded-xl border",
                    salesPage >= salesTotalPages
                      ? "pointer-events-none opacity-40"
                      : "text-foreground",
                  )}
                  aria-label="Next recorded revenue page"
                >
                  <ChevronRight size={16} />
                </Link>
              </div>
            </nav>
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
