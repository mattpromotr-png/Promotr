import {
  AlertTriangle,
  ArrowRight,
  CalendarCheck,
  CheckCircle2,
  ClipboardList,
  Sparkles,
  Users,
} from "lucide-react";
import Link from "next/link";

import { AdminShell } from "@/components/admin/admin-shell";
import { PageHeading } from "@/components/admin/page-heading";
import { requireAdmin } from "@/lib/auth/admin";
import { createAdminClient } from "@/lib/supabase/admin";

export const metadata = { title: "Admin overview" };
export const dynamic = "force-dynamic";

type RecentLead = {
  id: string;
  name: string;
  requested_date: string;
  party_size: number;
  booking_type: string;
  status: string;
  created_at: string;
};

const statusStyles: Record<string, string> = {
  new: "bg-violet/10 text-violet border-violet/20",
  contacted: "bg-sky-500/10 text-sky-600 dark:text-sky-300 border-sky-500/20",
  pending:
    "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20",
  booked: "bg-elevated text-muted border-border",
};

export default async function AdminOverviewPage() {
  await requireAdmin();
  const admin = createAdminClient();
  const now = new Date();
  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(now.getDate() - 30);
  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setDate(now.getDate() - 6);
  sevenDaysAgo.setHours(0, 0, 0, 0);

  const [
    totalResult,
    newResult,
    pendingResult,
    handoffResult,
    recentResult,
    monthResult,
    tableResult,
    guestListResult,
    trendResult,
    conversationResult,
  ] = await Promise.all([
    admin.from("leads").select("id", { count: "exact", head: true }),
    admin
      .from("leads")
      .select("id", { count: "exact", head: true })
      .eq("status", "new"),
    admin
      .from("leads")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending"),
    admin
      .from("conversations")
      .select("id", { count: "exact", head: true })
      .eq("status", "handoff_required"),
    admin
      .from("leads")
      .select(
        "id,name,requested_date,party_size,booking_type,status,created_at",
      )
      .order("created_at", { ascending: false })
      .limit(5),
    admin
      .from("leads")
      .select("id", { count: "exact", head: true })
      .gte("created_at", thirtyDaysAgo.toISOString()),
    admin
      .from("leads")
      .select("id", { count: "exact", head: true })
      .eq("booking_type", "table"),
    admin
      .from("leads")
      .select("id", { count: "exact", head: true })
      .eq("booking_type", "guest_list"),
    admin
      .from("leads")
      .select("created_at")
      .gte("created_at", sevenDaysAgo.toISOString())
      .order("created_at", { ascending: true }),
    admin
      .from("conversations")
      .select("id,channel,status,last_message_at,contacts(display_name)")
      .order("last_message_at", { ascending: false })
      .limit(3),
  ]);

  const results = [
    totalResult,
    newResult,
    pendingResult,
    handoffResult,
    recentResult,
    monthResult,
    tableResult,
    guestListResult,
    trendResult,
    conversationResult,
  ];
  if (results.some((result) => result.error))
    throw new Error("Unable to load the admin overview.");

  const recentLeads = (recentResult.data ?? []) as RecentLead[];
  const dayCounts = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(sevenDaysAgo);
    date.setDate(sevenDaysAgo.getDate() + index);
    const key = date.toISOString().slice(0, 10);
    return {
      key,
      label: new Intl.DateTimeFormat("en-CA", { weekday: "short" }).format(
        date,
      ),
      count: (trendResult.data ?? []).filter(
        (lead) => lead.created_at.slice(0, 10) === key,
      ).length,
    };
  });
  const highestDay = Math.max(1, ...dayCounts.map((day) => day.count));

  const metrics = [
    {
      label: "Total inquiries",
      value: totalResult.count ?? 0,
      detail: `${monthResult.count ?? 0} in the last 30 days`,
      icon: ClipboardList,
      color: "text-violet bg-violet/10",
    },
    {
      label: "New inquiries",
      value: newResult.count ?? 0,
      detail: "Waiting for first review",
      icon: Sparkles,
      color: "text-fuchsia-600 dark:text-fuchsia-300 bg-fuchsia-500/10",
    },
    {
      label: "Pending",
      value: pendingResult.count ?? 0,
      detail: "Awaiting a final decision",
      icon: CheckCircle2,
      color: "text-emerald-700 dark:text-emerald-300 bg-emerald-500/10",
    },
    {
      label: "Human follow-up",
      value: handoffResult.count ?? 0,
      detail: "Requires staff attention",
      icon: AlertTriangle,
      color: "text-amber-700 dark:text-amber-300 bg-amber-500/10",
    },
  ];

  return (
    <AdminShell active="overview">
      <PageHeading
        eyebrow="ADMIN OVERVIEW"
        title="Good to see you."
        description="A clear view of booking demand and conversations that need attention. All figures come from your live Promotr data."
        action={
          <Link
            href="/admin/leads?status=new"
            className="focus-ring bg-brand-gradient shadow-violet inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold text-white"
          >
            Review new inquiries
            <ArrowRight size={17} aria-hidden="true" />
          </Link>
        }
      />

      <section
        className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
        aria-label="Key metrics"
      >
        {metrics.map((metric) => {
          const Icon = metric.icon;
          return (
            <article key={metric.label} className="metric-card p-4">
              <div
                className={`grid size-9 place-items-center rounded-xl ${metric.color}`}
              >
                <Icon size={19} aria-hidden="true" />
              </div>
              <p className="text-muted mt-3 text-xs">{metric.label}</p>
              <p className="text-foreground mt-0.5 text-2xl font-semibold tracking-tight">
                {metric.value}
              </p>
              <p className="text-muted mt-1 text-xs">{metric.detail}</p>
            </article>
          );
        })}
      </section>

      <div className="mt-4 grid gap-4 xl:grid-cols-[1.35fr_.65fr]">
        <section
          className="surface-card overflow-hidden"
          aria-labelledby="recent-heading"
        >
          <div className="border-border flex items-center justify-between border-b px-5 py-4 sm:px-6">
            <div>
              <h2 id="recent-heading" className="text-foreground font-semibold">
                Recent inquiries
              </h2>
              <p className="text-muted mt-1 text-xs">Latest booking requests</p>
            </div>
            <Link
              className="text-violet text-sm font-medium"
              href="/admin/leads"
            >
              View all
            </Link>
          </div>
          {recentLeads.length === 0 ? (
            <p className="text-muted p-8 text-center text-sm">
              No inquiries yet.
            </p>
          ) : (
            <div className="divide-border divide-y">
              {recentLeads.map((lead) => (
                <Link
                  key={lead.id}
                  href={`/admin/leads?lead=${lead.id}`}
                  className="hover:bg-elevated/70 focus-ring grid gap-3 px-5 py-3 transition-colors sm:grid-cols-[1fr_auto_auto] sm:items-center sm:px-6"
                >
                  <div className="min-w-0">
                    <p className="text-foreground truncate font-medium">
                      {lead.name}
                    </p>
                    <p className="text-muted mt-1 text-xs capitalize">
                      {lead.booking_type.replace("_", " ")} · {lead.party_size}{" "}
                      guests
                    </p>
                  </div>
                  <div className="text-muted flex items-center gap-2 text-sm">
                    <CalendarCheck size={15} className="text-violet" />
                    {lead.requested_date}
                  </div>
                  <span
                    className={`w-fit rounded-full border px-2.5 py-1 text-xs capitalize ${statusStyles[lead.status]}`}
                  >
                    {lead.status}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </section>

        <section
          className="surface-card p-4 sm:p-5"
          aria-labelledby="trend-heading"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 id="trend-heading" className="text-foreground font-semibold">
                7-day activity
              </h2>
              <p className="text-muted mt-1 text-xs">New inquiry volume</p>
            </div>
            <div className="bg-violet/10 text-violet grid size-9 place-items-center rounded-xl">
              <Users size={17} aria-hidden="true" />
            </div>
          </div>
          <div
            className="mt-5 flex h-32 items-end justify-between gap-2"
            aria-label="Inquiry activity chart"
          >
            {dayCounts.map((day) => (
              <div
                key={day.key}
                className="flex h-full flex-1 flex-col items-center justify-end gap-2"
              >
                <span className="text-muted text-[10px]">{day.count}</span>
                <div
                  className="bg-brand-gradient min-h-1 w-full max-w-8 rounded-t-lg opacity-85"
                  style={{
                    height: `${Math.max(4, (day.count / highestDay) * 100)}%`,
                  }}
                  title={`${day.count} inquiries on ${day.key}`}
                />
                <span className="text-muted text-[10px]">{day.label}</span>
              </div>
            ))}
          </div>
          <div className="border-border mt-4 grid grid-cols-2 gap-4 border-t pt-4">
            <div>
              <p className="text-muted text-xs">Table inquiries</p>
              <p className="text-foreground mt-1 text-xl font-semibold">
                {tableResult.count ?? 0}
              </p>
            </div>
            <div>
              <p className="text-muted text-xs">Guest list</p>
              <p className="text-foreground mt-1 text-xl font-semibold">
                {guestListResult.count ?? 0}
              </p>
            </div>
          </div>
        </section>
      </div>

      <section
        className="surface-card mt-4 overflow-hidden"
        aria-labelledby="conversation-heading"
      >
        <div className="border-border flex items-center justify-between border-b px-5 py-4 sm:px-6">
          <div>
            <h2
              id="conversation-heading"
              className="text-foreground font-semibold"
            >
              Recent conversations
            </h2>
            <p className="text-muted mt-1 text-xs">
              Open a guest chat and join from the dashboard
            </p>
          </div>
          <Link
            href="/admin/conversations"
            className="text-violet text-sm font-medium"
          >
            View all
          </Link>
        </div>
        {(conversationResult.data ?? []).length === 0 ? (
          <p className="text-muted p-8 text-center text-sm">
            No conversations yet.
          </p>
        ) : (
          <div className="divide-border divide-y">
            {(conversationResult.data ?? []).map((conversation) => {
              const contact = Array.isArray(conversation.contacts)
                ? conversation.contacts[0]
                : conversation.contacts;
              return (
                <Link
                  key={conversation.id}
                  href={`/admin/conversations?conversation=${conversation.id}`}
                  className="hover:bg-elevated flex items-center justify-between gap-4 px-5 py-4 sm:px-6"
                >
                  <div>
                    <p className="text-foreground text-sm font-medium">
                      {contact?.display_name ||
                        (conversation.channel === "webchat"
                          ? "Website guest"
                          : conversation.channel === "sms"
                            ? "SMS guest"
                            : conversation.channel === "email"
                              ? "Email guest"
                              : "Instagram guest")}
                    </p>
                    <p className="text-muted mt-1 text-xs capitalize">
                      {conversation.channel.replace("_", " ")} ·{" "}
                      {conversation.status.replace("_", " ")}
                    </p>
                  </div>
                  <ArrowRight size={16} className="text-violet" />
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </AdminShell>
  );
}
