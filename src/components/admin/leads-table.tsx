"use client";

import {
  AlertTriangle,
  CalendarDays,
  Clock3,
  Mail,
  MessageCircle,
  Pencil,
  Phone,
  Save,
  Trash2,
  Users,
  Wine,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";

import {
  acknowledgeBookingChange,
  deleteLead,
  rescheduleTableBooking,
  updateLeadDetails,
} from "@/app/admin/leads/actions";
import { LeadStatusForm } from "@/components/admin/lead-status-form";
import { BookingConversation } from "@/components/admin/booking-conversation";
import { RevenueForm } from "@/components/admin/revenue-form";
import type { AdminLead } from "@/lib/admin/types";
import { tablePackages } from "@/config/table-packages";

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

function isPaymentProtected(lead: AdminLead) {
  const bookings = Array.isArray(lead.table_bookings)
    ? lead.table_bookings
    : lead.table_bookings
      ? [lead.table_bookings]
      : [];
  return bookings.some(
    (booking) =>
      booking.paid_at ||
      booking.status === "confirmed" ||
      booking.status === "refunded",
  );
}

function hasRelatedTableBooking(lead: AdminLead) {
  return Array.isArray(lead.table_bookings)
    ? lead.table_bookings.length > 0
    : Boolean(lead.table_bookings);
}

function getTableBooking(lead: AdminLead) {
  return Array.isArray(lead.table_bookings)
    ? lead.table_bookings[0]
    : lead.table_bookings || null;
}

function DetailsDialog({
  lead,
  close,
  editInitially,
  requestDelete,
}: {
  lead: AdminLead;
  close: () => void;
  editInitially: boolean;
  requestDelete: () => void;
}) {
  const [editing, setEditing] = useState(editInitially);
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    const onKeyDown = (event: KeyboardEvent) =>
      event.key === "Escape" && close();
    document.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [close]);

  const handoff = lead.conversations?.status === "handoff_required";
  const paymentProtected = isPaymentProtected(lead);
  const hasTableBooking = hasRelatedTableBooking(lead);
  const tableBooking = getTableBooking(lead);
  const latestChange = [...(lead.booking_change_history ?? [])].sort(
    (a, b) => Date.parse(b.created_at) - Date.parse(a.created_at),
  )[0];
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

          {lead.booking_change_status && (
            <div className="rounded-2xl border border-sky-500/25 bg-sky-500/10 p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-medium text-sky-800 dark:text-sky-200">
                    {lead.booking_change_status === "guest_updated"
                      ? "Guest updated this booking"
                      : lead.booking_change_status === "change_requested"
                        ? "Guest requested a booking change"
                        : "Booking updated by staff"}
                  </p>
                  <p className="mt-1 text-xs text-sky-900/70 dark:text-sky-100/70">
                    {latestChange
                      ? `${String(latestChange.previous_values.tableName ?? "Current table")} on ${String(latestChange.previous_values.bookingDate ?? "the current date")} → ${String(latestChange.new_values.tableName ?? "requested table")} on ${String(latestChange.new_values.bookingDate ?? "the requested date")} · ${String(latestChange.new_values.partySize ?? lead.party_size)} guests`
                      : "Review the date, party size and assigned table below."}
                  </p>
                </div>
                <form action={acknowledgeBookingChange}>
                  <input type="hidden" name="leadId" value={lead.id} />
                  <button className="focus-ring min-h-10 rounded-xl border border-sky-400/30 px-4 text-sm font-semibold text-sky-800 dark:text-sky-100">
                    Mark reviewed
                  </button>
                </form>
              </div>
            </div>
          )}

          {editing && (
            <form
              action={updateLeadDetails}
              className="border-violet/25 bg-violet/5 rounded-2xl border p-4 sm:p-5"
            >
              <input type="hidden" name="leadId" value={lead.id} />
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-foreground font-semibold">
                    Edit inquiry
                  </h3>
                  <p className="text-muted mt-1 text-xs">
                    Update details supplied directly by the guest.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setEditing(false)}
                  className="text-muted hover:text-foreground text-sm"
                >
                  Cancel
                </button>
              </div>
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <EditField
                  label="Guest name"
                  name="name"
                  value={lead.name}
                  required
                />
                <EditField
                  label="Email"
                  name="email"
                  value={lead.email ?? ""}
                  type="email"
                />
                <EditField
                  label="Phone"
                  name="phone"
                  value={lead.phone ?? ""}
                />
                <EditField
                  label="Instagram handle"
                  name="instagramHandle"
                  value={lead.instagram_handle ?? ""}
                />
                {hasTableBooking ? (
                  <>
                    <input
                      type="hidden"
                      name="requestedDate"
                      value={lead.requested_date}
                    />
                    <input
                      type="hidden"
                      name="partySize"
                      value={lead.party_size}
                    />
                    <input
                      type="hidden"
                      name="bookingType"
                      value={lead.booking_type}
                    />
                  </>
                ) : (
                  <>
                    <EditField
                      label="Requested date"
                      name="requestedDate"
                      value={lead.requested_date}
                      type="date"
                      required
                    />
                    <EditField
                      label="Party size"
                      name="partySize"
                      value={String(lead.party_size)}
                      type="number"
                      required
                    />
                    <label className="text-foreground text-sm font-medium">
                      Booking type
                      <select
                        name="bookingType"
                        defaultValue={lead.booking_type}
                        className="focus-ring border-border bg-surface mt-2 min-h-11 w-full rounded-xl border px-3"
                      >
                        <option value="guest_list">Guest list</option>
                        <option value="table">Table</option>
                        <option value="unsure">Undecided</option>
                      </select>
                    </label>
                  </>
                )}
                <EditField
                  label="Arrival time"
                  name="preferredArrivalTime"
                  value={lead.preferred_arrival_time?.slice(0, 5) ?? ""}
                  type="time"
                />
                <EditField
                  label="Occasion"
                  name="occasion"
                  value={lead.occasion ?? ""}
                />
                <EditField
                  label="Bottle preference"
                  name="bottlePreference"
                  value={lead.bottle_preference ?? ""}
                />
              </div>
              {hasTableBooking && (
                <p className="text-muted mt-4 text-xs">
                  Date, party size, and booking type are locked because a table
                  hold or payment record exists. Manage those operational
                  details from the table workflow.
                </p>
              )}
              <label className="text-foreground mt-4 block text-sm font-medium">
                Notes
                <textarea
                  name="notes"
                  defaultValue={lead.notes ?? ""}
                  maxLength={1000}
                  rows={4}
                  className="focus-ring border-border bg-surface mt-2 w-full rounded-xl border px-3 py-3"
                />
              </label>
              <button className="focus-ring bg-brand-gradient mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl px-5 text-sm font-semibold text-white">
                <Save size={16} /> Save changes
              </button>
            </form>
          )}

          {editing && tableBooking && (
            <form
              action={rescheduleTableBooking}
              className="rounded-2xl border border-fuchsia-500/25 bg-fuchsia-500/5 p-4 sm:p-5"
            >
              <input type="hidden" name="leadId" value={lead.id} />
              <input type="hidden" name="bookingId" value={tableBooking.id} />
              <div>
                <h3 className="text-foreground font-semibold">
                  Change table booking
                </h3>
                <p className="text-muted mt-1 text-xs leading-5">
                  Admin changes bypass the 48-hour cutoff, but capacity and
                  double-booking rules still apply. A different listed deposit
                  is recorded for review; it does not alter the Stripe amount
                  already paid.
                </p>
              </div>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <EditField
                  label="Booking date"
                  name="bookingDate"
                  value={tableBooking.booking_date}
                  type="date"
                  required
                />
                <EditField
                  label="Party size"
                  name="partySize"
                  value={String(lead.party_size)}
                  type="number"
                  required
                />
                <label className="text-foreground text-sm font-medium sm:col-span-2">
                  Assigned table
                  <select
                    name="tableId"
                    defaultValue={tableBooking.table_id}
                    className="focus-ring border-border bg-surface mt-2 min-h-11 w-full rounded-xl border px-3"
                  >
                    {tablePackages.map((table) => (
                      <option key={table.id} value={table.id}>
                        {table.name} · {table.capacity} guests · $
                        {table.depositCad} deposit · ${table.minimumSpendCad}{" "}
                        minimum
                      </option>
                    ))}
                  </select>
                </label>
                <EditField label="Reason for change" name="reason" value="" />
              </div>
              <button className="focus-ring bg-brand-gradient mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl px-5 text-sm font-semibold text-white">
                <CalendarDays size={16} /> Save booking change
              </button>
            </form>
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

          <div className="border-border flex flex-col gap-3 border-t pt-6 sm:flex-row sm:items-center sm:justify-between">
            <button
              type="button"
              onClick={() => setEditing((current) => !current)}
              className="focus-ring border-border bg-elevated text-foreground inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border px-4 text-sm font-semibold"
            >
              <Pencil size={16} /> {editing ? "Close editor" : "Edit inquiry"}
            </button>
            <div>
              <button
                type="button"
                onClick={requestDelete}
                disabled={paymentProtected}
                title={
                  paymentProtected
                    ? "Paid bookings must be retained for financial records."
                    : undefined
                }
                className="focus-ring inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-red-500/30 px-4 text-sm font-semibold text-red-600 disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto dark:text-red-300"
              >
                <Trash2 size={16} /> Delete inquiry
              </button>
            </div>
          </div>
          {paymentProtected && (
            <p className="text-muted -mt-4 text-xs sm:text-right">
              This inquiry cannot be deleted because it has a Stripe payment
              history.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}

function DeleteConfirmation({
  lead,
  cancel,
}: {
  lead: AdminLead;
  cancel: () => void;
}) {
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    const onKeyDown = (event: KeyboardEvent) =>
      event.key === "Escape" && cancel();
    document.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [cancel]);
  return (
    <div
      className="fixed inset-0 z-[60] grid place-items-center bg-black/75 p-4 backdrop-blur-sm"
      role="presentation"
      onMouseDown={(event) => event.target === event.currentTarget && cancel()}
    >
      <section
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="delete-inquiry-title"
        aria-describedby="delete-inquiry-description"
        className="border-border bg-surface w-full max-w-md rounded-3xl border p-6 shadow-2xl sm:p-7"
      >
        <span className="grid size-12 place-items-center rounded-2xl bg-red-500/10 text-red-600 dark:text-red-300">
          <Trash2 size={21} />
        </span>
        <h2
          id="delete-inquiry-title"
          className="text-foreground mt-5 text-xl font-semibold"
        >
          Delete this inquiry?
        </h2>
        <p
          id="delete-inquiry-description"
          className="text-muted mt-2 text-sm leading-6"
        >
          <strong className="text-foreground">{lead.name}</strong> and their
          inquiry details will be permanently removed. This action cannot be
          undone.
        </p>
        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={cancel}
            className="focus-ring border-border bg-elevated text-foreground min-h-11 rounded-xl border px-5 text-sm font-semibold"
          >
            Keep inquiry
          </button>
          <form action={deleteLead}>
            <input type="hidden" name="leadId" value={lead.id} />
            <button className="focus-ring min-h-11 w-full rounded-xl bg-red-600 px-5 text-sm font-semibold text-white hover:bg-red-500">
              Delete permanently
            </button>
          </form>
        </div>
      </section>
    </div>
  );
}

function EditField({
  label,
  name,
  value,
  type = "text",
  required = false,
}: {
  label: string;
  name: string;
  value: string;
  type?: string;
  required?: boolean;
}) {
  return (
    <label className="text-foreground text-sm font-medium">
      {label}
      <input
        name={name}
        type={type}
        defaultValue={value}
        required={required}
        min={type === "number" ? 1 : undefined}
        max={type === "number" ? 100 : undefined}
        className="focus-ring border-border bg-surface mt-2 min-h-11 w-full rounded-xl border px-3"
      />
    </label>
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
  const [selectedId, setSelectedId] = useState<string | null>(
    initialLeadId ?? initialLead?.id ?? null,
  );
  const [editOnOpen, setEditOnOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const selected = selectedId
    ? (leads.find((lead) => lead.id === selectedId) ??
      (initialLead?.id === selectedId ? initialLead : null))
    : null;
  const deleteCandidate = deleteId
    ? (leads.find((lead) => lead.id === deleteId) ??
      (initialLead?.id === deleteId ? initialLead : null))
    : null;
  if (leads.length === 0) return null;

  return (
    <>
      <div className="surface-card mt-5 overflow-hidden">
        <div className="hidden overflow-x-auto md:block">
          <table className="w-full min-w-[920px] text-left">
            <thead className="bg-elevated/80 text-muted text-xs font-medium tracking-wider uppercase">
              <tr>
                <th className="px-5 py-3">Guest</th>
                <th className="px-4 py-3">Requested date</th>
                <th className="px-4 py-3">Party</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-center">Actions</th>
                <th className="px-5 py-3 text-right">Submitted</th>
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
                    <td className="px-5 py-3">
                      <button
                        type="button"
                        className="focus-ring w-full rounded-lg text-left"
                        onClick={() => {
                          setEditOnOpen(false);
                          setSelectedId(lead.id);
                        }}
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
                    <td className="text-foreground px-4 py-3 text-sm">
                      {lead.requested_date}
                      {lead.preferred_arrival_time ? (
                        <span className="text-muted block text-xs">
                          {lead.preferred_arrival_time.slice(0, 5)}
                        </span>
                      ) : null}
                    </td>
                    <td className="text-foreground px-4 py-3 text-sm">
                      {lead.party_size}
                    </td>
                    <td className="text-muted px-4 py-3 text-sm">
                      {bookingType(lead.booking_type)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="min-w-44">
                        <LeadStatusForm
                          leadId={lead.id}
                          status={lead.status}
                          compact
                        />
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setEditOnOpen(true);
                            setSelectedId(lead.id);
                          }}
                          className="focus-ring border-border bg-elevated text-muted hover:text-foreground grid size-9 place-items-center rounded-xl border"
                          aria-label={`Edit ${lead.name}'s inquiry`}
                          title="Edit inquiry"
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteId(lead.id)}
                          disabled={isPaymentProtected(lead)}
                          className="focus-ring grid size-9 place-items-center rounded-xl border border-red-500/25 text-red-500 disabled:cursor-not-allowed disabled:opacity-35"
                          aria-label={`Delete ${lead.name}'s inquiry`}
                          title={
                            isPaymentProtected(lead)
                              ? "Paid inquiries cannot be deleted"
                              : "Delete inquiry"
                          }
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                    <td className="text-muted px-5 py-3 text-right text-xs">
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
            <article key={lead.id} className="p-3.5">
              <button
                type="button"
                onClick={() => {
                  setEditOnOpen(false);
                  setSelectedId(lead.id);
                }}
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
              <div className="border-border mt-3 flex items-end gap-2 border-t pt-3">
                <div className="min-w-0 flex-1">
                  <LeadStatusForm
                    leadId={lead.id}
                    status={lead.status}
                    compact
                  />
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setEditOnOpen(true);
                    setSelectedId(lead.id);
                  }}
                  className="focus-ring border-border bg-elevated text-muted grid size-9 shrink-0 place-items-center rounded-xl border"
                  aria-label={`Edit ${lead.name}'s inquiry`}
                >
                  <Pencil size={15} />
                </button>
                <button
                  type="button"
                  onClick={() => setDeleteId(lead.id)}
                  disabled={isPaymentProtected(lead)}
                  className="focus-ring grid size-9 shrink-0 place-items-center rounded-xl border border-red-500/25 text-red-500 disabled:opacity-35"
                  aria-label={`Delete ${lead.name}'s inquiry`}
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </article>
          ))}
        </div>
      </div>
      {selected && (
        <DetailsDialog
          key={`${selected.id}-${editOnOpen ? "edit" : "view"}`}
          lead={selected}
          editInitially={editOnOpen}
          requestDelete={() => setDeleteId(selected.id)}
          close={() => {
            setSelectedId(null);
            setEditOnOpen(false);
          }}
        />
      )}
      {deleteCandidate && !isPaymentProtected(deleteCandidate) && (
        <DeleteConfirmation
          lead={deleteCandidate}
          cancel={() => setDeleteId(null)}
        />
      )}
    </>
  );
}
