import {
  ArrowUpRight,
  Building2,
  CalendarDays,
  ExternalLink,
  LogOut,
  Mail,
  MessageCircleMore,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import Link from "next/link";

import { signOut } from "@/app/admin/login/actions";
import { disconnectGmail } from "@/app/admin/settings/actions";
import { AdminShell } from "@/components/admin/admin-shell";
import { PageHeading } from "@/components/admin/page-heading";
import { VenueInformationForm } from "@/components/admin/venue-information-form";
import { VenueKnowledgeManager } from "@/components/admin/venue-knowledge-manager";
import { ThemeToggle } from "@/components/theme-toggle";
import { requireAdmin } from "@/lib/auth/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { readVenueKnowledgeUpdates } from "@/lib/venue/knowledge";
import {
  formatPublishedVenueInformation,
  readPublishedVenueInformation,
} from "@/lib/venue/published-information";

export const metadata = { title: "Settings" };
export const dynamic = "force-dynamic";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ gmail?: string }>;
}) {
  const user = await requireAdmin();
  const gmailMessage = (await searchParams).gmail;
  const admin = createAdminClient();
  const [{ data: venue }, { data: gmail }] = await Promise.all([
    admin
      .from("venues")
      .select("venue_facts")
      .eq("slug", "promotr-nightclub")
      .maybeSingle(),
    admin
      .from("gmail_connections")
      .select("email_address,status,last_synced_at,watch_expiration")
      .limit(1)
      .maybeSingle(),
  ]);
  const venueInformation = readPublishedVenueInformation(venue?.venue_facts);
  const venueKnowledge = readVenueKnowledgeUpdates(venue?.venue_facts);
  const hasPreviousInformation = Boolean(
    formatPublishedVenueInformation(venueInformation),
  );

  return (
    <AdminShell active="settings">
      <PageHeading
        eyebrow="MANAGER WORKSPACE"
        title="Settings"
        description="Manage venue information, your account, appearance, and workspace links in one place."
      />

      <section className="surface-card mt-5 p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <span className="bg-violet/15 text-violet grid size-10 shrink-0 place-items-center rounded-xl">
            <Building2 size={20} aria-hidden="true" />
          </span>
          <div>
            <h2 className="text-foreground font-semibold">Venue information</h2>
            <p className="text-muted mt-1 max-w-3xl text-sm leading-6">
              Add confirmed venue knowledge, schedule when it applies, and
              control what Vera can use in new SMS and Instagram replies.
              Vera&apos;s safety and privacy rules cannot be edited here.
            </p>
          </div>
        </div>
        <VenueKnowledgeManager updates={venueKnowledge} />
      </section>

      {hasPreviousInformation ? (
        <section className="surface-card mt-5 p-5 sm:p-6">
          <div>
            <h2 className="text-foreground font-semibold">
              Previous venue updates
            </h2>
            <p className="text-muted mt-1 max-w-3xl text-sm leading-6">
              These were added with the earlier editor. Edit or clear the test
              information here, then use the Venue Knowledge cards above for
              future updates.
            </p>
          </div>
          <VenueInformationForm information={venueInformation} />
        </section>
      ) : null}

      <section className="surface-card mt-5 p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            <span className="bg-violet/15 text-violet grid size-10 shrink-0 place-items-center rounded-xl">
              <Mail size={20} aria-hidden="true" />
            </span>
            <div>
              <h2 className="text-foreground font-semibold">Gmail inbox</h2>
              <p className="text-muted mt-1 max-w-3xl text-sm leading-6">
                Connect the dedicated Promotr mailbox so incoming emails appear
                in Conversations and can use the same Vera concierge as SMS and
                Instagram.
              </p>
            </div>
          </div>
          {gmail ? (
            <form action={disconnectGmail}>
              <button className="focus-ring border-border bg-elevated text-foreground hover:border-violet min-h-10 rounded-xl border px-4 text-sm font-medium">
                Disconnect
              </button>
            </form>
          ) : (
            <Link
              href="/api/integrations/gmail/connect"
              className="focus-ring bg-brand-gradient inline-flex min-h-10 items-center justify-center rounded-xl px-4 text-sm font-semibold text-white"
            >
              Connect Gmail
            </Link>
          )}
        </div>
        {gmailMessage && (
          <p
            role="status"
            className={`mt-4 rounded-xl border px-4 py-3 text-sm ${gmailMessage === "connected" ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" : "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300"}`}
          >
            {gmailMessage === "connected"
              ? "Gmail connected successfully."
              : "Gmail could not be connected. Check the Google setup and try again."}
          </p>
        )}
        <dl className="border-border mt-5 grid gap-4 border-t pt-4 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-muted text-xs">Mailbox</dt>
            <dd className="text-foreground mt-1 font-medium">
              {gmail?.email_address || "matt.promotr@gmail.com"}
            </dd>
          </div>
          <div>
            <dt className="text-muted text-xs">Status</dt>
            <dd className="text-foreground mt-1 font-medium capitalize">
              {gmail?.status || "Not connected"}
            </dd>
          </div>
          <div>
            <dt className="text-muted text-xs">Last synchronized</dt>
            <dd className="text-foreground mt-1 font-medium">
              {gmail?.last_synced_at
                ? new Intl.DateTimeFormat("en-CA", {
                    dateStyle: "medium",
                    timeStyle: "short",
                    timeZone: "America/Toronto",
                  }).format(new Date(gmail.last_synced_at))
                : "Waiting for connection"}
            </dd>
          </div>
        </dl>
        <p className="text-muted mt-4 text-xs leading-5">
          Google access is authorized by the mailbox owner. Promotr never stores
          or asks for the Gmail password.
        </p>
      </section>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <section className="surface-card p-5 sm:p-6">
          <div className="flex items-start gap-3">
            <span className="bg-violet/15 text-violet grid size-10 shrink-0 place-items-center rounded-xl">
              <UserRound size={20} aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <h2 className="text-foreground font-semibold">
                Account & appearance
              </h2>
              <p className="text-muted mt-1 text-sm">
                Signed in as {user.email ?? "manager"}
              </p>
            </div>
          </div>
          <div className="border-border mt-5 flex items-center justify-between gap-4 border-t pt-4">
            <div>
              <p className="text-foreground text-sm font-medium">Color theme</p>
              <p className="text-muted mt-1 text-xs">
                Switch between the existing dark and light themes.
              </p>
            </div>
            <ThemeToggle />
          </div>
          <div className="border-border mt-4 flex items-center justify-between gap-4 border-t pt-4">
            <div>
              <p className="text-foreground text-sm font-medium">
                Account session
              </p>
              <p className="text-muted mt-1 text-xs">
                Sign out of the manager workspace on this device.
              </p>
            </div>
            <form action={signOut}>
              <button
                type="submit"
                className="focus-ring border-border bg-elevated text-foreground hover:border-violet inline-flex min-h-10 items-center gap-2 rounded-xl border px-3 text-sm font-medium"
              >
                <LogOut size={16} aria-hidden="true" />
                Sign out
              </button>
            </form>
          </div>
        </section>

        <section className="surface-card p-5 sm:p-6">
          <div className="flex items-start gap-3">
            <span className="bg-violet/15 text-violet grid size-10 shrink-0 place-items-center rounded-xl">
              <MessageCircleMore size={20} aria-hidden="true" />
            </span>
            <div>
              <h2 className="text-foreground font-semibold">Guest messaging</h2>
              <p className="text-muted mt-1 text-sm">
                Manage responses and follow-ups in each guest conversation.
              </p>
            </div>
          </div>
          <div className="border-border mt-5 space-y-1 border-t pt-3">
            <SettingsLink
              href="/admin/conversations"
              label="Conversation controls"
              detail="Pause or resume AI replies; configure SMS follow-ups per conversation."
            />
            <SettingsLink
              href="/admin/follow-ups"
              label="Staff follow-ups"
              detail="Review guests who need a human response."
            />
          </div>
        </section>

        <section className="surface-card p-5 sm:p-6">
          <div className="flex items-start gap-3">
            <span className="bg-violet/15 text-violet grid size-10 shrink-0 place-items-center rounded-xl">
              <CalendarDays size={20} aria-hidden="true" />
            </span>
            <div>
              <h2 className="text-foreground font-semibold">
                Bookings & venue operations
              </h2>
              <p className="text-muted mt-1 text-sm">
                Go to the tools already used by your team.
              </p>
            </div>
          </div>
          <div className="border-border mt-5 space-y-1 border-t pt-3">
            <SettingsLink
              href="/admin/leads"
              label="Booking inquiries"
              detail="Review guest requests and update their status."
            />
            <SettingsLink
              href="/admin/reservations"
              label="Reservations"
              detail="View confirmed bookings for a selected date."
            />
            <SettingsLink
              href="/admin/guest-list"
              label="Guest List"
              detail="Review guest-list requests and confirmations."
            />
            <SettingsLink
              href="/admin/tables"
              label="Table map"
              detail="Review table bookings and availability."
            />
            <SettingsLink
              href="/admin/lost-found"
              label="Lost & found"
              detail="Review reports and found-item records."
            />
          </div>
        </section>

        <section className="surface-card p-5 sm:p-6">
          <div className="flex items-start gap-3">
            <span className="bg-violet/15 text-violet grid size-10 shrink-0 place-items-center rounded-xl">
              <ShieldCheck size={20} aria-hidden="true" />
            </span>
            <div>
              <h2 className="text-foreground font-semibold">
                Public pages & privacy
              </h2>
              <p className="text-muted mt-1 text-sm">
                Check the pages guests can access. Integration secrets are never
                displayed here.
              </p>
            </div>
          </div>
          <div className="border-border mt-5 space-y-1 border-t pt-3">
            <SettingsLink
              href="/book"
              label="Booking form"
              detail="Preview the guest-facing inquiry form."
              external
            />
            <SettingsLink
              href="/privacy"
              label="Privacy policy"
              detail="Read the public privacy notice."
              external
            />
            <SettingsLink
              href="/data-deletion"
              label="Data deletion"
              detail="Read the public deletion instructions."
              external
            />
          </div>
        </section>
      </div>
    </AdminShell>
  );
}

function SettingsLink({
  href,
  label,
  detail,
  external = false,
}: {
  href: string;
  label: string;
  detail: string;
  external?: boolean;
}) {
  return (
    <Link
      href={href}
      target={external ? "_blank" : undefined}
      rel={external ? "noopener noreferrer" : undefined}
      className="focus-ring hover:bg-elevated group flex items-center justify-between gap-4 rounded-xl px-3 py-3 transition-colors"
    >
      <span className="min-w-0">
        <span className="text-foreground block text-sm font-medium">
          {label}
        </span>
        <span className="text-muted mt-0.5 block text-xs leading-5">
          {detail}
        </span>
      </span>
      {external ? (
        <ExternalLink
          size={16}
          className="text-muted group-hover:text-violet shrink-0"
          aria-hidden="true"
        />
      ) : (
        <ArrowUpRight
          size={16}
          className="text-muted group-hover:text-violet shrink-0"
          aria-hidden="true"
        />
      )}
    </Link>
  );
}
