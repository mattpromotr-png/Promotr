"use client";

import { Search, SlidersHorizontal } from "lucide-react";
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
      <ClubFloorMap tables={tables} bookings={bookings} dimmedIds={dimmedIds} />
    </>
  );
}
