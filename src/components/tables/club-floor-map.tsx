"use client";

import { Armchair, Martini, Music2 } from "lucide-react";
import type { ReactNode } from "react";
import type { TablePackage } from "@/config/table-packages";

export type FloorBooking = {
  tableId: string;
  status: "held" | "confirmed" | string;
  guestName?: string;
  partySize?: number;
};

type ClubFloorMapProps = {
  tables: TablePackage[];
  selectedId?: string;
  disabledIds?: string[];
  dimmedIds?: string[];
  bookings?: FloorBooking[];
  onSelect?: (table: TablePackage) => void;
};

export function ClubFloorMap({
  tables,
  selectedId,
  disabledIds = [],
  dimmedIds = [],
  bookings = [],
  onSelect,
}: ClubFloorMapProps) {
  const disabled = new Set(disabledIds);
  const dimmed = new Set(dimmedIds);
  const bookingByTable = new Map(bookings.map((item) => [item.tableId, item]));

  return (
    <div>
      <div className="relative mx-auto aspect-[10/12] w-full max-w-4xl overflow-hidden rounded-[1.75rem] border border-white/10 bg-[#050711] shadow-[0_30px_90px_rgba(3,4,12,.55)] sm:aspect-[16/11]">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_15%,rgba(139,92,246,.25),transparent_32%),radial-gradient(circle_at_50%_65%,rgba(236,72,153,.12),transparent_42%)]" />
        <div className="pointer-events-none absolute inset-3 rounded-[1.35rem] border border-white/[.07]" />
        <div className="absolute top-[2.5%] left-1/2 flex h-[9%] w-[48%] -translate-x-1/2 items-center justify-center rounded-b-[2.5rem] border-x border-b border-violet-300/30 bg-gradient-to-b from-violet-500/40 to-fuchsia-500/10 text-[8px] font-black tracking-[.28em] text-violet-100 shadow-[0_10px_45px_rgba(139,92,246,.25)] sm:text-xs">
          <Music2 className="mr-2 size-3 sm:size-4" /> STAGE &amp; DJ
        </div>
        <ZoneLabel className="top-[23%] left-[3%] -rotate-90">LOUNGE</ZoneLabel>
        <ZoneLabel className="top-[23%] right-[1%] rotate-90">
          PREMIUM VIP
        </ZoneLabel>
        <ZoneLabel className="bottom-[8%] left-1/2 -translate-x-1/2">
          BACK LOUNGE
        </ZoneLabel>
        <div className="pointer-events-none absolute inset-x-[26%] top-[27%] bottom-[29%] rounded-[35%] border border-dashed border-fuchsia-300/15 bg-[radial-gradient(circle,rgba(168,85,247,.1)_1px,transparent_1px)] bg-[length:13px_13px]">
          <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[7px] font-bold tracking-[.3em] text-white/10 sm:text-[10px]">
            DANCE FLOOR
          </span>
        </div>
        <Landmark
          className="bottom-[3%] left-[4%]"
          icon={<Martini />}
          label="BAR"
        />
        <Landmark
          className="right-[4%] bottom-[3%]"
          icon={<Martini />}
          label="BAR"
        />
        <div className="absolute bottom-[2.5%] left-1/2 -translate-x-1/2 rounded-t-xl border-x border-t border-emerald-300/25 bg-emerald-400/10 px-3 py-1 text-[7px] font-bold tracking-[.2em] text-emerald-200 sm:text-[9px]">
          ENTRANCE
        </div>

        {tables.map((table) => {
          const booking = bookingByTable.get(table.id);
          const isSelected = selectedId === table.id;
          const isDisabled = disabled.has(table.id) || Boolean(booking);
          const isDimmed = dimmed.has(table.id);
          const stateClass = isSelected
            ? "z-20 border-white bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white shadow-[0_0_0_3px_rgba(167,139,250,.22),0_0_25px_rgba(168,85,247,.7)]"
            : booking?.status === "confirmed"
              ? "border-emerald-300/60 bg-emerald-500/25 text-emerald-100"
              : booking
                ? "border-amber-300/60 bg-amber-500/25 text-amber-100"
                : isDisabled
                  ? "border-red-300/30 bg-red-500/15 text-red-200 opacity-55"
                  : "border-white/25 bg-[#161728]/90 text-white hover:z-20 hover:scale-110 hover:border-violet-300 hover:bg-violet-500/30";

          return (
            <button
              key={table.id}
              type="button"
              disabled={!onSelect || isDisabled}
              onClick={() => onSelect?.(table)}
              style={{ left: `${table.x}%`, top: `${table.y}%` }}
              className={`focus-ring group absolute h-7 min-w-7 -translate-x-1/2 -translate-y-1/2 border px-1 text-[7px] font-black transition duration-200 sm:h-11 sm:min-w-11 sm:text-[10px] ${table.shape === "booth" ? "rounded-lg" : "rounded-full"} ${stateClass} ${isDimmed ? "scale-90 opacity-15 grayscale" : ""} ${!onSelect ? "cursor-default" : "disabled:cursor-not-allowed"}`}
              aria-label={`${table.name}${booking ? `, ${booking.status}` : isDisabled ? ", unavailable" : ", available"}`}
              title={`${table.name} · up to ${table.capacity} guests · $${table.depositCad} deposit${booking?.guestName ? ` · ${booking.guestName}` : ""}`}
            >
              {table.shape === "booth" && (
                <Armchair className="mx-auto hidden size-2 opacity-60 sm:block" />
              )}
              {table.code}
            </button>
          );
        })}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-[11px]">
        <LegendDot className="bg-white/60" label="Available" />
        {onSelect && <LegendDot className="bg-violet-500" label="Selected" />}
        <LegendDot className="bg-amber-400" label="Payment hold" />
        <LegendDot className="bg-emerald-400" label="Confirmed" />
        {onSelect && (
          <LegendDot className="bg-red-400" label="Unavailable / too small" />
        )}
      </div>
    </div>
  );
}

function ZoneLabel({
  className,
  children,
}: {
  className: string;
  children: ReactNode;
}) {
  return (
    <span
      className={`pointer-events-none absolute text-[6px] font-bold tracking-[.24em] text-white/25 sm:text-[9px] ${className}`}
    >
      {children}
    </span>
  );
}

function Landmark({
  className,
  icon,
  label,
}: {
  className: string;
  icon: ReactNode;
  label: string;
}) {
  return (
    <div
      className={`pointer-events-none absolute flex items-center gap-1 text-[7px] font-bold tracking-[.18em] text-cyan-200/60 sm:text-[9px] ${className}`}
    >
      <span className="[&>svg]:size-3">{icon}</span>
      {label}
    </div>
  );
}

function LegendDot({ className, label }: { className: string; label: string }) {
  return (
    <span className="text-muted flex items-center gap-1.5">
      <span className={`size-2 rounded-full ${className}`} />
      {label}
    </span>
  );
}
