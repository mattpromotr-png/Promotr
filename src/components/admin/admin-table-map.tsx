"use client";

import {
  ExternalLink,
  Search,
  SlidersHorizontal,
  UserRound,
  X,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import {
  ClubFloorMap,
  type FloorBooking,
} from "@/components/tables/club-floor-map";
import type { TablePackage } from "@/config/table-packages";

export function AdminTableMap({
  tables,
  bookings,
}: {
  tables: TablePackage[];
  bookings: FloorBooking[];
}) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [zone, setZone] = useState("all");
  const [capacity, setCapacity] = useState(0);
  const [selectedBooking, setSelectedBooking] = useState<FloorBooking | null>(
    null,
  );
  const bookingByTable = useMemo(
    () => new Map(bookings.map((item) => [item.tableId, item])),
    [bookings],
  );
  const zones = [...new Set(tables.map((table) => table.zone))];
  const dimmedIds = tables
    .filter((table) => {
      const booking = bookingByTable.get(table.id);
      const tableStatus = booking?.status || "available";
      return !(
        (!search ||
          table.code.toLowerCase().includes(search.toLowerCase()) ||
          table.name.toLowerCase().includes(search.toLowerCase())) &&
        (status === "all" || tableStatus === status) &&
        (zone === "all" || table.zone === zone) &&
        table.capacity >= capacity
      );
    })
    .map((table) => table.id);
  const visibleCount = tables.length - dimmedIds.length;

  const control =
    "focus-ring border-border bg-elevated text-foreground min-h-10 rounded-xl border px-3 text-sm";
  return (
    <>
      <div className="border-border bg-elevated mb-5 rounded-2xl border p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <p className="text-foreground flex items-center gap-2 text-sm font-semibold">
            <SlidersHorizontal className="text-violet" size={16} />
            Filter floor map
          </p>
          <p className="text-muted text-xs">
            {visibleCount} of {tables.length} tables highlighted
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <label className="relative">
            <Search className="text-muted absolute top-1/2 left-3 size-4 -translate-y-1/2" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search table code"
              className={`${control} w-full pl-9`}
            />
          </label>
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            className={control}
            aria-label="Filter by booking status"
          >
            <option value="all">All statuses</option>
            <option value="available">Available</option>
            <option value="held">Payment hold</option>
            <option value="confirmed">Confirmed</option>
          </select>
          <select
            value={zone}
            onChange={(event) => setZone(event.target.value)}
            className={control}
            aria-label="Filter by zone"
          >
            <option value="all">All zones</option>
            {zones.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
          <select
            value={capacity}
            onChange={(event) => setCapacity(Number(event.target.value))}
            className={control}
            aria-label="Filter by minimum capacity"
          >
            <option value="0">Any capacity</option>
            <option value="6">6+ guests</option>
            <option value="8">8+ guests</option>
            <option value="10">10+ guests</option>
          </select>
        </div>
      </div>
      <ClubFloorMap
        tables={tables}
        bookings={bookings}
        dimmedIds={dimmedIds}
        onBookingSelect={setSelectedBooking}
      />
      {selectedBooking && (
        <div
          className="fixed inset-0 z-[70] grid place-items-center bg-black/70 p-4 backdrop-blur-sm"
          role="presentation"
          onMouseDown={(event) =>
            event.target === event.currentTarget && setSelectedBooking(null)
          }
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="table-booking-guest"
            className="border-border bg-surface w-full max-w-md rounded-3xl border p-6 shadow-2xl"
          >
            <div className="flex items-start justify-between gap-4">
              <span className="bg-violet/10 text-violet grid size-12 place-items-center rounded-2xl">
                <UserRound size={20} />
              </span>
              <button
                type="button"
                onClick={() => setSelectedBooking(null)}
                className="focus-ring border-border bg-elevated text-muted grid size-10 place-items-center rounded-xl border"
                aria-label="Close booking details"
              >
                <X size={16} />
              </button>
            </div>
            <p className="eyebrow mt-5">TABLE BOOKING</p>
            <h2
              id="table-booking-guest"
              className="text-foreground mt-2 text-xl font-semibold"
            >
              {selectedBooking.guestName || "Booking guest"}
            </h2>
            <p className="text-muted mt-2 text-sm capitalize">
              {selectedBooking.partySize || "Unknown"} guests ·{" "}
              {selectedBooking.status}
            </p>
            {selectedBooking.leadId ? (
              <Link
                href={`/admin/leads?lead=${selectedBooking.leadId}`}
                className="focus-ring bg-brand-gradient mt-6 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold text-white"
              >
                Open inquiry <ExternalLink size={15} />
              </Link>
            ) : (
              <p className="text-muted mt-5 text-xs">
                No inquiry is linked to this table hold.
              </p>
            )}
          </section>
        </div>
      )}
    </>
  );
}
