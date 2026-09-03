"use client";

import {
  AlertTriangle,
  CalendarDays,
  Clock3,
  Mail,
  MessageCircle,
  Phone,
  Users,
  Wine,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";

import { LeadStatusForm } from "@/components/admin/lead-status-form";
import { BookingConversation } from "@/components/admin/booking-conversation";
import { RevenueForm } from "@/components/admin/revenue-form";
import type { AdminLead } from "@/lib/admin/types";

const statusStyles: Record<AdminLead["status"], string> = {
  new: "border-violet/25 bg-violet/10 text-violet",
  contacted: "border-sky-500/25 bg-sky-500/10 text-sky-700 dark:text-sky-300",
  pending:
    "border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  booked: "border-border bg-elevated text-muted",
};

function StatusBadge({ status }: { status: AdminLead["status"] }) {
  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium capitalize ${statusStyles[status]}`}
    >
      {status}
    </span>
  );
}

function bookingType(value: AdminLead["booking_type"]) {
  return value === "guest_list"
    ? "Guest list"
    : value === "table"
      ? "Table"
      : "Undecided";
}

function DetailsDialog({
  lead,
  close,
}: {
  lead: AdminLead;
  close: () => void;
}) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) =>
      event.key === "Escape" && close();
    document.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [close]);

  const handoff = lead.conversations?.status === "handoff_required";
  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/65 p-3 backdrop-blur-sm sm:p-6"
      role="presentation"
      onMouseDown={(event) => event.target === event.currentTarget && close()}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="lead-dialog-title"
        className="border-border bg-surface max-h-[92svh] w-full max-w-3xl overflow-y-auto rounded-3xl border shadow-2xl"
      >
        <div className="border-border bg-elevated/60 sticky top-0 z-10 flex items-start justify-between gap-4 border-b px-5 py-5 backdrop-blur-xl sm:px-7">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2
                id="lead-dialog-title"
                className="text-foreground text-xl font-semibold sm:text-2xl"
              >
                {lead.name}
              </h2>
              <StatusBadge status={lead.status} />
            </div>
            <p className="text-muted mt-1 text-sm">
              Submitted{" "}
              {new Intl.DateTimeFormat("en-CA", {
                dateStyle: "medium",
                timeStyle: "short",
              }).format(new Date(lead.created_at))}
            </p>
          </div>
          <button
            type="button"
            onClick={close}
            className="focus-ring border-border bg-surface text-muted grid size-10 shrink-0 place-items-center rounded-xl border"
            aria-label="Close booking details"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        <div className="space-y-6 p-5 sm:p-7">
          {handoff && (
            <div className="rounded-2xl border border-amber-500/25 bg-amber-500/10 p-4">
              <div className="flex items-center gap-2 font-medium text-amber-800 dark:text-amber-200">
                <AlertTriangle size={17} aria-hidden="true" />
                Human follow-up required
              </div>
              <p className="mt-2 text-sm leading-6 text-amber-900/80 dark:text-amber-100/80">
                {lead.conversations?.handoff_reason ||
                  "The conversation requires staff attention."}
              </p>
            </div>
          )}

          <section aria-labelledby="booking-information">
            <h3
              id="booking-information"
              className="text-foreground text-sm font-semibold tracking-wide uppercase"
            >
              Booking information
            </h3>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {[
                {
                  icon: CalendarDays,
                  label: "Requested date",
                  value: lead.requested_date,
                },
                {
                  icon: Clock3,
                  label: "Arrival time",
                  value:
                    lead.preferred_arrival_time?.slice(0, 5) || "Not provided",
                },
                {
                  icon: Users,
                  label: "Party size",
                  value: `${lead.party_size} guests`,
                },
                {
                  icon: Wine,
                  label: "Booking type",
                  value: bookingType(lead.booking_type),
                },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.label}
                    className="border-border bg-elevated rounded-2xl border p-4"
                  >
                    <div className="text-muted flex items-center gap-2 text-xs">
                      <Icon
                        size={15}
                        className="text-violet"
                        aria-hidden="true"
                      />
                      {item.label}
                    </div>
                    <p className="text-foreground mt-2 font-medium">
                      {item.value}
                    </p>
                  </div>
                );
              })}
            </div>
          </section>

          <section
            className="grid gap-6 sm:grid-cols-2"
            aria-label="Guest and inquiry details"
          >
            <div>
              <h3 className="text-foreground text-sm font-semibold tracking-wide uppercase">
                Contact
              </h3>
              <div className="text-muted mt-3 space-y-3 text-sm">
                {lead.email && (
                  <a
                    className="hover:text-foreground flex items-center gap-2"
                    href={`mailto:${lead.email}`}
                  >
                    <Mail size={16} className="text-violet" />
                    {lead.email}
                  </a>
                )}
                {lead.phone && (
                  <a
                    className="hover:text-foreground flex items-center gap-2"
                    href={`tel:${lead.phone}`}
                  >
                    <Phone size={16} className="text-violet" />
                    {lead.phone}
                  </a>
                )}
                {lead.instagram_handle && (
                  <p className="flex items-center gap-2">
                    <MessageCircle size={16} className="text-violet" />@
                    {lead.instagram_handle.replace(/^@/, "")}
                  </p>
                )}
              </div>
            </div>
            <div>
              <h3 className="text-foreground text-sm font-semibold tracking-wide uppercase">
                Preferences
              </h3>
              <dl className="mt-3 space-y-3 text-sm">
                <div>
                  <dt className="text-muted">Occasion</dt>
                  <dd className="text-foreground mt-1">
                    {lead.occasion || "Not provided"}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted">Bottle preference</dt>
                  <dd className="text-foreground mt-1">
                    {lead.bottle_preference || "Not provided"}
                  </dd>
                </div>
              </dl>
            </div>
          </section>

          <section>
            <h3 className="text-foreground text-sm font-semibold tracking-wide uppercase">
              Guest notes
            </h3>
            <p className="border-border bg-elevated text-muted mt-3 min-h-20 rounded-2xl border p-4 text-sm leading-6">
              {lead.notes || "No additional notes were provided."}
            </p>
          </section>

          <RevenueForm
            leadId={lead.id}
            amount={lead.confirmed_revenue_cad}
            enabled={lead.status === "booked" && lead.booking_type === "table"}
            disabledReason={
              lead.booking_type !== "table"
                ? "Revenue is available for table and bottle-service bookings."
                : "Mark this inquiry as Booked before recording confirmed revenue."
            }
          />

          <div className="border-border grid gap-4 border-t pt-6 sm:grid-cols-[1fr_auto] sm:items-end">
            <LeadStatusForm leadId={lead.id} status={lead.status} />
            <p className="text-muted max-w-xs text-xs leading-5 sm:text-right">
              Use Booked only after the venue has confirmed the reservation.
            </p>
          </div>

          <BookingConversation conversation={lead.conversations} />
        </div>
      </section>
    </div>
  );
}

export function LeadsTable({
  leads,
  initialLeadId,
  initialLead,
}: {
  leads: AdminLead[];
  initialLeadId?: string;
  initialLead?: AdminLead | null;
}) {
  const [selected, setSelected] = useState<AdminLead | null>(
    leads.find((lead) => lead.id === initialLeadId) ?? initialLead ?? null,
  );
  useEffect(() => {
    setSelected((current) => {
      if (!current) return current;
      return (
        leads.find((lead) => lead.id === current.id) ??
        (initialLead?.id === current.id ? initialLead : current)
      );
    });
  }, [leads, initialLead]);
  if (leads.length === 0) return null;

  return (
    <>
      <div className="surface-card mt-5 overflow-hidden">
        <div className="hidden overflow-x-auto md:block">
          <table className="w-full min-w-[850px] text-left">
            <thead className="bg-elevated/80 text-muted text-xs font-medium tracking-wider uppercase">
              <tr>
                <th className="px-5 py-4">Guest</th>
                <th className="px-4 py-4">Requested date</th>
                <th className="px-4 py-4">Party</th>
                <th className="px-4 py-4">Type</th>
                <th className="px-4 py-4">Status</th>
                <th className="px-5 py-4 text-right">Submitted</th>
              </tr>
            </thead>
            <tbody className="divide-border divide-y">
              {leads.map((lead) => {
                const handoff =
                  lead.conversations?.status === "handoff_required";
                return (
                  <tr
                    key={lead.id}
                    className="hover:bg-elevated/60 transition-colors"
                  >
                    <td className="px-5 py-4">
                      <button
                        type="button"
                        className="focus-ring w-full rounded-lg text-left"
                        onClick={() => setSelected(lead)}
                      >
                        <span className="text-foreground flex items-center gap-2 font-medium">
                          {lead.name}
                          {handoff && (
                            <AlertTriangle
                              size={14}
                              className="text-amber-500"
                              aria-label="Human follow-up required"
                            />
                          )}
                        </span>
                        <span className="text-muted mt-1 block max-w-56 truncate text-xs">
                          {lead.email ||
                            lead.phone ||
                            lead.instagram_handle ||
                            "Contact available in details"}
                        </span>
                      </button>
                    </td>
                    <td className="text-foreground px-4 py-4 text-sm">
                      {lead.requested_date}
                      {lead.preferred_arrival_time ? (
                        <span className="text-muted block text-xs">
                          {lead.preferred_arrival_time.slice(0, 5)}
                        </span>
                      ) : null}
                    </td>
                    <td className="text-foreground px-4 py-4 text-sm">
                      {lead.party_size}
                    </td>
                    <td className="text-muted px-4 py-4 text-sm">
                      {bookingType(lead.booking_type)}
                    </td>
                    <td className="px-4 py-4">
                      <div className="min-w-44">
                        <LeadStatusForm
                          leadId={lead.id}
                          status={lead.status}
                          compact
                        />
                      </div>
                    </td>
                    <td className="text-muted px-5 py-4 text-right text-xs">
                      {new Intl.DateTimeFormat("en-CA", {
                        dateStyle: "medium",
                      }).format(new Date(lead.created_at))}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="divide-border divide-y md:hidden">
          {leads.map((lead) => (
            <article key={lead.id} className="p-4">
              <button
                type="button"
                onClick={() => setSelected(lead)}
                className="focus-ring hover:bg-elevated/60 block w-full rounded-xl text-left"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-foreground flex items-center gap-2 font-medium">
                      {lead.name}
                      {lead.conversations?.status === "handoff_required" && (
                        <AlertTriangle size={14} className="text-amber-500" />
                      )}
                    </p>
                    <p className="text-muted mt-1 text-xs">
                      {bookingType(lead.booking_type)} · {lead.party_size}{" "}
                      guests
                    </p>
                  </div>
                  <StatusBadge status={lead.status} />
                </div>
                <p className="text-muted mt-4 flex items-center gap-2 text-sm">
                  <CalendarDays size={15} className="text-violet" />
                  {lead.requested_date}
                </p>
              </button>
              <div className="border-border mt-4 border-t pt-3">
                <LeadStatusForm leadId={lead.id} status={lead.status} compact />
              </div>
            </article>
          ))}
        </div>
      </div>
      {selected && (
        <DetailsDialog lead={selected} close={() => setSelected(null)} />
      )}
    </>
  );
}
