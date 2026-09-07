"use client";

import { CalendarDays, LoaderCircle } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { rescheduleTableBooking } from "@/app/admin/leads/actions";
import { tablePackages } from "@/config/table-packages";

export function AdminBookingChangeForm({
  leadId,
  bookingId,
  currentTableId,
  bookingDate,
  partySize: initialPartySize,
}: {
  leadId: string;
  bookingId: string;
  currentTableId: string;
  bookingDate: string;
  partySize: number;
}) {
  const [date, setDate] = useState(bookingDate);
  const [partySize, setPartySize] = useState(initialPartySize);
  const [selectedTableId, setSelectedTableId] = useState(currentTableId);
  const [availability, setAvailability] = useState<{
    date: string;
    unavailableIds: string[];
    error: boolean;
  }>({ date: "", unavailableIds: [], error: false });

  useEffect(() => {
    const controller = new AbortController();
    fetch(
      `/api/tables?date=${encodeURIComponent(date)}&excludeBookingId=${bookingId}`,
      { cache: "no-store", signal: controller.signal },
    )
      .then(async (response) => {
        if (!response.ok) throw new Error("Availability unavailable");
        return response.json();
      })
      .then((payload) =>
        setAvailability({
          date,
          unavailableIds: payload.unavailableTableIds ?? [],
          error: false,
        }),
      )
      .catch((error) => {
        if (error instanceof Error && error.name === "AbortError") return;
        setAvailability({ date, unavailableIds: [], error: true });
      });
    return () => controller.abort();
  }, [bookingId, date]);
  const loading = availability.date !== date;
  const loadError = !loading && availability.error;

  const availableTables = useMemo(() => {
    const unavailableIds =
      availability.date === date ? availability.unavailableIds : [];
    return tablePackages.filter(
      (table) =>
        table.capacity >= partySize && !unavailableIds.includes(table.id),
    );
  }, [availability, date, partySize]);
  const effectiveTableId = availableTables.some(
    (table) => table.id === selectedTableId,
  )
    ? selectedTableId
    : "";

  return (
    <form
      action={rescheduleTableBooking}
      className="rounded-2xl border border-fuchsia-500/25 bg-fuchsia-500/5 p-4 sm:p-5"
    >
      <input type="hidden" name="leadId" value={leadId} />
      <input type="hidden" name="bookingId" value={bookingId} />
      <div>
        <h3 className="text-foreground font-semibold">Change table booking</h3>
        <p className="text-muted mt-1 text-xs leading-5">
          Only tables available on the selected date and large enough for the
          party are shown. Stripe&apos;s original payment remains unchanged.
        </p>
      </div>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <label className="text-foreground text-sm font-medium">
          Booking date
          <input
            name="bookingDate"
            type="date"
            required
            value={date}
            onChange={(event) => setDate(event.target.value)}
            className="focus-ring border-border bg-surface mt-2 min-h-11 w-full rounded-xl border px-3"
          />
        </label>
        <label className="text-foreground text-sm font-medium">
          Party size
          <input
            name="partySize"
            type="number"
            min="1"
            max="100"
            required
            value={partySize}
            onChange={(event) => setPartySize(Number(event.target.value))}
            className="focus-ring border-border bg-surface mt-2 min-h-11 w-full rounded-xl border px-3"
          />
        </label>
        <label className="text-foreground text-sm font-medium sm:col-span-2">
          Assigned table
          <select
            name="tableId"
            required
            disabled={loading || loadError || availableTables.length === 0}
            value={effectiveTableId}
            onChange={(event) => setSelectedTableId(event.target.value)}
            className="focus-ring border-border bg-surface mt-2 min-h-11 w-full rounded-xl border px-3 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <option value="">
              {loading
                ? "Checking availability…"
                : availableTables.length
                  ? "Select an available table"
                  : "No suitable tables available"}
            </option>
            {availableTables.map((table) => (
              <option key={table.id} value={table.id}>
                {table.name} · up to {table.capacity} guests · $
                {table.depositCad} deposit · ${table.minimumSpendCad} minimum
              </option>
            ))}
          </select>
        </label>
        <label className="text-foreground text-sm font-medium sm:col-span-2">
          Reason for change
          <input
            name="reason"
            maxLength={500}
            placeholder="Optional internal reason"
            className="focus-ring border-border bg-surface mt-2 min-h-11 w-full rounded-xl border px-3"
          />
        </label>
      </div>
      {loadError && (
        <p className="mt-3 text-xs text-red-500">
          Availability could not be loaded. Try another date or reload the page.
        </p>
      )}
      <button
        disabled={loading || loadError || !effectiveTableId}
        className="focus-ring bg-brand-gradient mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl px-5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading ? (
          <LoaderCircle className="animate-spin" size={16} />
        ) : (
          <CalendarDays size={16} />
        )}
        Save booking change
      </button>
    </form>
  );
}
