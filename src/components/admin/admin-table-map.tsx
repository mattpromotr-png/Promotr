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
        <div className="border-border bg-elevated mt-5 flex flex-col gap-4 rounded-2xl border p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="bg-violet/10 text-violet grid size-10 place-items-center rounded-xl">
              <UserRound size={18} />
            </span>
            <div>
              <p className="text-foreground font-semibold">
                {selectedBooking.guestName || "Booking guest"}
              </p>
              <p className="text-muted mt-1 text-xs capitalize">
                {selectedBooking.partySize || "Unknown"} guests ·{" "}
                {selectedBooking.status}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            {selectedBooking.leadId && (
              <Link
                href={`/admin/leads?lead=${selectedBooking.leadId}`}
                className="focus-ring bg-brand-gradient inline-flex min-h-10 items-center gap-2 rounded-xl px-4 text-sm font-semibold text-white"
              >
                Open inquiry <ExternalLink size={15} />
              </Link>
            )}
            <button
              type="button"
              onClick={() => setSelectedBooking(null)}
              className="focus-ring border-border bg-surface text-muted grid size-10 place-items-center rounded-xl border"
              aria-label="Close booking details"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
