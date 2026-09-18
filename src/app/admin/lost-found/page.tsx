import {
  CalendarDays,
  CheckCircle2,
  MapPin,
  PackageSearch,
  Phone,
  Plus,
  UserRound,
} from "lucide-react";

import {
  addFoundItem,
  updateFoundItemStatus,
  updateLostReportStatus,
} from "./actions";
import { AdminShell } from "@/components/admin/admin-shell";
import { PageHeading } from "@/components/admin/page-heading";
import { SubmitButton } from "@/components/admin/submit-button";
import { requireAdmin } from "@/lib/auth/admin";
import { createAdminClient } from "@/lib/supabase/admin";

export const metadata = { title: "Lost and found" };
export const dynamic = "force-dynamic";

type FoundItem = {
  id: string;
  item_name: string;
  description: string;
  found_date: string;
  approximate_found_time: string | null;
  found_location: string | null;
  table_number: string | null;
  status: string;
  internal_notes: string | null;
};
type LostReport = {
  id: string;
  name: string;
  phone: string;
  email: string;
  item_description: string;
  lost_date: string;
  approximate_lost_time: string | null;
  last_known_location: string | null;
  status: string;
  created_at: string;
};

const inputClass =
  "focus-ring min-h-10 w-full rounded-xl border border-border bg-elevated px-3 text-sm text-foreground outline-none";

export default async function LostFoundAdminPage() {
  await requireAdmin();
  const admin = createAdminClient();
  const [itemsResult, reportsResult] = await Promise.all([
    admin
      .from("found_items")
      .select(
        "id,item_name,description,found_date,approximate_found_time,found_location,table_number,status,internal_notes",
      )
      .order("found_date", { ascending: false })
      .limit(30),
    admin
      .from("lost_found_reports")
      .select(
        "id,name,phone,email,item_description,lost_date,approximate_lost_time,last_known_location,status,created_at",
      )
      .order("created_at", { ascending: false })
      .limit(30),
  ]);
  if (itemsResult.error || reportsResult.error)
    throw new Error(
      "Unable to load lost and found records. Run the latest database migration first.",
    );
  const items = (itemsResult.data ?? []) as FoundItem[];
  const reports = (reportsResult.data ?? []) as LostReport[];
  const openReports = reports.filter(
    (report) => report.status !== "closed",
  ).length;
  const availableItems = items.filter(
    (item) => item.status === "available",
  ).length;

  return (
    <AdminShell active="lost-found">
      <PageHeading
        eyebrow="VENUE OPERATIONS"
        title="Lost and found"
        description="Record items found by staff and review reports submitted by guests."
        action={
          <div className="flex gap-2">
            <span className="border-border bg-surface rounded-xl border px-3 py-2 text-sm">
              <strong>{openReports}</strong> open reports
            </span>
            <span className="border-border bg-surface rounded-xl border px-3 py-2 text-sm">
              <strong>{availableItems}</strong> available items
            </span>
          </div>
        }
      />

      <div className="mt-4 grid gap-4 xl:grid-cols-[0.75fr_1.25fr]">
        <section className="surface-card p-4">
          <div className="flex items-center gap-3">
            <span className="bg-violet/10 text-violet grid size-10 place-items-center rounded-xl">
              <Plus size={18} />
            </span>
            <div>
              <h2 className="font-semibold">Add a found item</h2>
              <p className="text-muted text-xs">
                Only safe public details are shared with the concierge.
              </p>
            </div>
          </div>
          <form
            action={addFoundItem}
            className="mt-4 grid gap-3 sm:grid-cols-2"
          >
            <input
              required
              name="itemName"
              placeholder="Item name"
              className={inputClass}
            />
            <input
              required
              name="foundDate"
              type="date"
              defaultValue={new Date().toISOString().slice(0, 10)}
              className={inputClass}
            />
            <textarea
              required
              name="description"
              placeholder="Description"
              rows={3}
              className={`${inputClass} py-2 sm:col-span-2`}
            />
            <input
              name="approximateFoundTime"
              type="time"
              className={inputClass}
            />
            <input
              name="foundLocation"
              placeholder="Found location"
              className={inputClass}
            />
            <input
              name="tableNumber"
              placeholder="Table number (optional)"
              className={inputClass}
            />
            <input
              name="internalNotes"
              placeholder="Internal notes (never shared)"
              className={inputClass}
            />
            <SubmitButton
              pendingLabel="Adding…"
              className="bg-brand-gradient min-h-10 rounded-xl px-4 text-sm font-semibold text-white sm:col-span-2"
            >
              Add found item
            </SubmitButton>
          </form>
        </section>

        <section className="surface-card overflow-hidden">
          <div className="border-border flex items-center justify-between border-b p-5">
            <div>
              <h2 className="font-semibold">Found inventory</h2>
              <p className="text-muted mt-1 text-xs">
                Available items can be considered by the concierge.
              </p>
            </div>
            <PackageSearch className="text-violet" size={20} />
          </div>
          <div className="divide-border max-h-[390px] divide-y overflow-y-auto">
            {items.length === 0 ? (
              <p className="text-muted p-6 text-sm">No found items recorded.</p>
            ) : (
              items.map((item) => (
                <article key={`${item.id}:${item.status}`} className="p-4">
                  <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium">{item.item_name}</h3>
                        <span className="bg-elevated text-muted rounded-full px-2 py-0.5 text-xs capitalize">
                          {item.status}
                        </span>
                      </div>
                      <p className="text-muted mt-1 text-sm leading-5">
                        {item.description}
                      </p>
                      <p className="text-muted mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs">
                        <span>
                          <CalendarDays className="mr-1 inline" size={13} />
                          {item.found_date}
                          {item.approximate_found_time
                            ? ` at ${item.approximate_found_time.slice(0, 5)}`
                            : ""}
                        </span>
                        {item.found_location && (
                          <span>
                            <MapPin className="mr-1 inline" size={13} />
                            {item.found_location}
                            {item.table_number
                              ? ` · Table ${item.table_number}`
                              : ""}
                          </span>
                        )}
                      </p>
                    </div>
                    <form
                      action={updateFoundItemStatus}
                      className="flex shrink-0 gap-2"
                    >
                      <input type="hidden" name="id" value={item.id} />
                      <select
                        name="status"
                        defaultValue={item.status}
                        className={inputClass}
                      >
                        <option value="available">Available</option>
                        <option value="matched">Matched</option>
                        <option value="claimed">Claimed</option>
                        <option value="disposed">Disposed</option>
                      </select>
                      <SubmitButton
                        pendingLabel="…"
                        className="border-border bg-elevated min-h-10 rounded-xl border px-3 text-sm"
                      >
                        Save
                      </SubmitButton>
                    </form>
                  </div>
                </article>
              ))
            )}
          </div>
        </section>
      </div>

      <section className="surface-card mt-4 overflow-hidden">
        <div className="border-border flex items-center justify-between border-b p-5">
          <div>
            <h2 className="font-semibold">Guest reports</h2>
            <p className="text-muted mt-1 text-xs">
              Contact details and lost-item descriptions submitted through the
              public form.
            </p>
          </div>
          <UserRound className="text-violet" size={20} />
        </div>
        <div className="grid gap-3 p-4 lg:grid-cols-2">
          {reports.length === 0 ? (
            <p className="text-muted p-2 text-sm">No guest reports received.</p>
          ) : (
            reports.map((report) => (
              <article
                key={`${report.id}:${report.status}`}
                className="border-border bg-elevated rounded-2xl border p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-semibold">{report.name}</h3>
                    <p className="text-muted mt-1 text-xs">
                      <Phone className="mr-1 inline" size={12} />
                      {report.phone} · {report.email}
                    </p>
                  </div>
                  <span className="bg-surface rounded-full px-2 py-1 text-xs capitalize">
                    {report.status}
                  </span>
                </div>
                <p className="mt-3 text-sm leading-6">
                  {report.item_description}
                </p>
                <p className="text-muted mt-2 text-xs">
                  Lost {report.lost_date}
                  {report.approximate_lost_time
                    ? ` around ${report.approximate_lost_time.slice(0, 5)}`
                    : ""}
                  {report.last_known_location
                    ? ` · ${report.last_known_location}`
                    : ""}
                </p>
                <form
                  action={updateLostReportStatus}
                  className="mt-4 flex gap-2"
                >
                  <input type="hidden" name="id" value={report.id} />
                  <select
                    name="status"
                    defaultValue={report.status}
                    className={inputClass}
                  >
                    <option value="open">Open</option>
                    <option value="reviewing">Reviewing</option>
                    <option value="matched">Matched</option>
                    <option value="closed">Closed</option>
                  </select>
                  <SubmitButton
                    pendingLabel="Saving…"
                    className="border-border bg-surface min-h-10 rounded-xl border px-3 text-sm"
                  >
                    <CheckCircle2 size={15} /> Save
                  </SubmitButton>
                </form>
              </article>
            ))
          )}
        </div>
      </section>
    </AdminShell>
  );
}
