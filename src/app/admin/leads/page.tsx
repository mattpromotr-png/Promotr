import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import Link from "next/link";

import { AdminShell } from "@/components/admin/admin-shell";
import { LeadsTable } from "@/components/admin/leads-table";
import { PageHeading } from "@/components/admin/page-heading";
import type { AdminLead, LeadStatus } from "@/lib/admin/types";
import { requireAdmin } from "@/lib/auth/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { cn } from "@/lib/utils";

const filters = ["all", "new", "contacted", "pending", "booked"] as const;
type Filter = (typeof filters)[number];
const PAGE_SIZE = 20;
const leadSelection =
  "id,name,email,phone,instagram_handle,requested_date,preferred_arrival_time,party_size,occasion,booking_type,bottle_preference,notes,status,created_at,confirmed_revenue_cad,booked_at,conversations(id,status,handoff_reason,channel,human_takeover,messages(id,sender_type,content,metadata,created_at))";

export const metadata = { title: "Booking inquiries" };
export const dynamic = "force-dynamic";

function pageHref({
  status,
  query,
  page,
}: {
  status: Filter;
  query: string;
  page: number;
}) {
  const params = new URLSearchParams();
  if (status !== "all") params.set("status", status);
  if (query) params.set("q", query);
  if (page > 1) params.set("page", String(page));
  const value = params.toString();
  return value ? `/admin/leads?${value}` : "/admin/leads";
}

export default async function AdminLeadsPage({
  searchParams,
}: {
  searchParams: Promise<{
    status?: string;
    q?: string;
    page?: string;
    lead?: string;
  }>;
}) {
  await requireAdmin();
  const params = await searchParams;
  const filter: Filter = filters.includes(params.status as Filter)
    ? (params.status as Filter)
    : "all";
  const search = (params.q ?? "")
    .trim()
    .replace(/[,()%]/g, "")
    .slice(0, 80);
  const requestedPage = Number.parseInt(params.page ?? "1", 10);
  const page =
    Number.isFinite(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  const admin = createAdminClient();

  let query = admin
    .from("leads")
    .select(leadSelection, { count: "exact" })
    .order("created_at", { ascending: false })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
  if (filter !== "all") query = query.eq("status", filter);
  if (search)
    query = query.or(
      `name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%,instagram_handle.ilike.%${search}%`,
    );

  const countRequests = filters.map((status) => {
    let countQuery = admin
      .from("leads")
      .select("id", { count: "exact", head: true });
    if (status !== "all")
      countQuery = countQuery.eq("status", status as LeadStatus);
    return countQuery;
  });
  const [leadResult, ...countResults] = await Promise.all([
    query,
    ...countRequests,
  ]);
  if (leadResult.error || countResults.some((result) => result.error))
    throw new Error("Unable to load booking inquiries.");

  const leads = (leadResult.data ?? []) as unknown as AdminLead[];
  const selectedId = /^[0-9a-f-]{36}$/i.test(params.lead ?? "")
    ? params.lead
    : undefined;
  let initialLead: AdminLead | null = null;
  if (selectedId && !leads.some((lead) => lead.id === selectedId)) {
    const selectedResult = await admin
      .from("leads")
      .select(leadSelection)
      .eq("id", selectedId)
      .maybeSingle();
    if (selectedResult.error)
      throw new Error("Unable to load booking details.");
    initialLead = selectedResult.data as unknown as AdminLead | null;
  }
  const total = leadResult.count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const statusCounts = Object.fromEntries(
    filters.map((status, index) => [status, countResults[index].count ?? 0]),
  );

  return (
    <AdminShell active="inquiries">
      <PageHeading
        eyebrow="BOOKING OPERATIONS"
        title="Booking inquiries"
        description="Review requests, contact guests, and manage progress. An inquiry is never a confirmed reservation."
      />

      <section className="mt-8" aria-label="Inquiry controls">
        <form
          className="flex flex-col gap-3 sm:flex-row"
          action="/admin/leads"
          method="get"
        >
          {filter !== "all" && (
            <input type="hidden" name="status" value={filter} />
          )}
          <label className="relative flex-1">
            <span className="sr-only">Search inquiries</span>
            <Search
              className="text-muted pointer-events-none absolute top-1/2 left-4 -translate-y-1/2"
              size={18}
            />
            <input
              name="q"
              defaultValue={search}
              placeholder="Search name, email, phone or Instagram…"
              className="focus-ring border-border bg-surface text-foreground placeholder:text-muted min-h-12 w-full rounded-2xl border pr-4 pl-11 text-sm shadow-sm"
            />
          </label>
          <button
            className="focus-ring bg-brand-gradient shadow-violet min-h-12 rounded-2xl px-5 text-sm font-semibold text-white"
            type="submit"
          >
            Search
          </button>
          {search && (
            <Link
              className="focus-ring border-border bg-surface text-muted inline-flex min-h-12 items-center justify-center rounded-2xl border px-4 text-sm"
              href={pageHref({ status: filter, query: "", page: 1 })}
            >
              Clear
            </Link>
          )}
        </form>

        <nav
          className="mt-4 flex gap-2 overflow-x-auto pb-2"
          aria-label="Filter inquiries by status"
        >
          {filters.map((status) => (
            <Link
              key={status}
              href={pageHref({ status, query: search, page: 1 })}
              aria-current={filter === status ? "page" : undefined}
              className={cn(
                "focus-ring inline-flex min-h-10 shrink-0 items-center gap-2 rounded-xl border px-3.5 text-sm capitalize",
                filter === status
                  ? "border-violet bg-violet/10 text-foreground"
                  : "border-border bg-surface text-muted hover:text-foreground",
              )}
            >
              {status}
              <span className="bg-elevated rounded-full px-1.5 py-0.5 text-[10px] font-semibold tabular-nums">
                {statusCounts[status]}
              </span>
            </Link>
          ))}
        </nav>
      </section>

      {leads.length === 0 ? (
        <div className="surface-card text-muted mt-5 p-12 text-center text-sm">
          No inquiries match these filters.
        </div>
      ) : (
        <LeadsTable
          leads={leads}
          initialLeadId={selectedId}
          initialLead={initialLead}
        />
      )}

      {totalPages > 1 && (
        <nav
          className="mt-5 flex items-center justify-between gap-4"
          aria-label="Inquiry pages"
        >
          <p className="text-muted text-xs">
            Page {Math.min(page, totalPages)} of {totalPages} · {total} results
          </p>
          <div className="flex gap-2">
            <Link
              aria-disabled={page <= 1}
              tabIndex={page <= 1 ? -1 : undefined}
              href={pageHref({
                status: filter,
                query: search,
                page: Math.max(1, page - 1),
              })}
              className={cn(
                "focus-ring border-border bg-surface inline-flex min-h-10 items-center gap-2 rounded-xl border px-3 text-sm",
                page <= 1
                  ? "pointer-events-none opacity-40"
                  : "text-foreground",
              )}
            >
              <ChevronLeft size={16} />
              Previous
            </Link>
            <Link
              aria-disabled={page >= totalPages}
              tabIndex={page >= totalPages ? -1 : undefined}
              href={pageHref({
                status: filter,
                query: search,
                page: Math.min(totalPages, page + 1),
              })}
              className={cn(
                "focus-ring border-border bg-surface inline-flex min-h-10 items-center gap-2 rounded-xl border px-3 text-sm",
                page >= totalPages
                  ? "pointer-events-none opacity-40"
                  : "text-foreground",
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
