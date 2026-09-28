"use client";

import { useActionState, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { saveOpeningCalendar } from "@/app/admin/settings/actions";
import {
  defaultVenueCalendar,
  resolveVenueNight,
  WEEKDAYS,
  type VenueCalendar,
} from "@/lib/venue/calendar";

export function VenueOpeningCalendar({
  calendar,
  today,
}: {
  calendar: VenueCalendar | null;
  today: string;
}) {
  const [value, setValue] = useState(calendar || defaultVenueCalendar());
  const [selected, setSelected] = useState(today);
  const [month, setMonth] = useState(today.slice(0, 7));
  const [state, action, pending] = useActionState(saveOpeningCalendar, {
    status: "idle" as const,
    message: "",
  });
  const first = new Date(`${month}-01T12:00:00Z`);
  const count = new Date(
    Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0),
  ).getUTCDate();
  const exception = value.exceptions.find((item) => item.date === selected);
  const selectedHours = resolveVenueNight(value, selected);
  const inputClass =
    "border-border bg-elevated text-foreground rounded-lg border px-2 py-2 text-sm";
  function changeMonth(step: number) {
    const next = new Date(first);
    next.setUTCMonth(next.getUTCMonth() + step);
    setMonth(next.toISOString().slice(0, 7));
  }
  function editException(patch: Partial<VenueCalendar["weekly"][number]>) {
    const hours = {
      closed: selectedHours.closed,
      opens: selectedHours.opens,
      closes: selectedHours.closes,
      ...patch,
    };
    setValue({
      ...value,
      exceptions: [
        ...value.exceptions.filter((item) => item.date !== selected),
        { date: selected, hours },
      ].sort((a, b) => a.date.localeCompare(b.date)),
    });
  }
  return (
    <form
      action={action}
      className="border-border mt-5 rounded-2xl border p-4 sm:p-5"
    >
      <h3 className="text-foreground font-semibold">Opening-hours calendar</h3>
      <p className="text-muted mt-1 text-sm">
        All times are Toronto time. Closing before opening means the following
        day. Save to apply these hours to new agent replies; this does not
        change existing bookings. Once saved, this calendar takes priority over
        opening hours or closures written in knowledge updates.
      </p>
      {!calendar && (
        <p className="text-muted mt-2 text-sm">
          Suggested hours are shown below. Review them before saving; they are
          not yet published.
        </p>
      )}
      <input type="hidden" name="calendar" value={JSON.stringify(value)} />
      <div className="mt-4 grid gap-6 xl:grid-cols-2">
        <fieldset disabled={pending}>
          <legend className="text-foreground mb-3 text-sm font-semibold">
            Regular weekly hours
          </legend>
          {value.weekly.map((hours, index) => (
            <div
              key={WEEKDAYS[index]}
              className="border-border flex flex-wrap items-center gap-2 border-b py-2"
            >
              <span className="text-foreground w-24 text-sm">
                {WEEKDAYS[index]}
              </span>
              <label className="text-muted flex items-center gap-1 text-sm">
                <input
                  type="checkbox"
                  checked={!hours.closed}
                  onChange={(event) =>
                    setValue({
                      ...value,
                      weekly: value.weekly.map((item, day) =>
                        day === index
                          ? { ...item, closed: !event.target.checked }
                          : item,
                      ),
                    })
                  }
                />
                Open
              </label>
              <input
                aria-label={`${WEEKDAYS[index]} opening time`}
                type="time"
                className={inputClass}
                disabled={hours.closed}
                value={hours.opens}
                onChange={(event) =>
                  setValue({
                    ...value,
                    weekly: value.weekly.map((item, day) =>
                      day === index
                        ? { ...item, opens: event.target.value }
                        : item,
                    ),
                  })
                }
              />
              <span className="text-muted">–</span>
              <input
                aria-label={`${WEEKDAYS[index]} closing time`}
                type="time"
                className={inputClass}
                disabled={hours.closed}
                value={hours.closes}
                onChange={(event) =>
                  setValue({
                    ...value,
                    weekly: value.weekly.map((item, day) =>
                      day === index
                        ? { ...item, closes: event.target.value }
                        : item,
                    ),
                  })
                }
              />
            </div>
          ))}
        </fieldset>
        <div>
          <div className="flex items-center justify-between">
            <button
              type="button"
              aria-label="Previous month"
              onClick={() => changeMonth(-1)}
              className="text-foreground p-2"
            >
              <ChevronLeft size={18} />
            </button>
            <h4 className="text-foreground text-sm font-semibold">
              {first.toLocaleDateString("en-CA", {
                timeZone: "UTC",
                month: "long",
                year: "numeric",
              })}
            </h4>
            <button
              type="button"
              aria-label="Next month"
              onClick={() => changeMonth(1)}
              className="text-foreground p-2"
            >
              <ChevronRight size={18} />
            </button>
          </div>
          <div className="mt-2 grid grid-cols-7 gap-1">
            {WEEKDAYS.map((day) => (
              <span key={day} className="text-muted py-1 text-center text-xs">
                {day.slice(0, 3)}
              </span>
            ))}
            {Array.from({ length: first.getUTCDay() }, (_, index) => (
              <span key={`empty-${index}`} />
            ))}
            {Array.from({ length: count }, (_, index) => {
              const date = `${month}-${String(index + 1).padStart(2, "0")}`;
              const night = resolveVenueNight(value, date);
              return (
                <button
                  type="button"
                  key={date}
                  aria-pressed={selected === date}
                  aria-label={`${date}: ${night.closed ? "Closed" : "Open"}${night.exception ? ", special hours" : ""}`}
                  onClick={() => setSelected(date)}
                  className={`rounded-lg border p-2 text-center transition-colors ${night.closed ? "border-red-500/45 bg-red-500/15 text-red-800 dark:text-red-200" : "border-emerald-500/45 bg-emerald-500/15 text-emerald-800 dark:text-emerald-200"} ${selected === date ? "ring-violet ring-2" : ""}`}
                >
                  <span className="block text-sm font-semibold">
                    {index + 1}
                  </span>
                  <span className="block text-[10px] font-medium">
                    {night.closed ? "Closed" : "Open"}
                    {night.exception ? " *" : ""}
                  </span>
                </button>
              );
            })}
          </div>
          <fieldset
            disabled={pending}
            className="border-border mt-4 rounded-xl border p-3"
          >
            <legend className="text-foreground px-1 text-sm font-medium">
              Special hours / closure
            </legend>
            <label className="text-muted block text-sm">
              Date
              <input
                type="date"
                className={`${inputClass} mt-1 block`}
                value={selected}
                onChange={(event) => {
                  if (event.target.value) {
                    setSelected(event.target.value);
                    setMonth(event.target.value.slice(0, 7));
                  }
                }}
              />
            </label>
            <p className="text-muted my-2 text-xs">
              {exception
                ? "This date overrides weekly hours."
                : "Currently follows weekly hours. Change below to add an exception."}
            </p>
            <label className="text-foreground flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={selectedHours.closed}
                onChange={(event) =>
                  editException({ closed: event.target.checked })
                }
              />
              Closed this night
            </label>
            <div className="mt-2 flex flex-wrap gap-2">
              <input
                type="time"
                aria-label="Special opening time"
                className={inputClass}
                disabled={selectedHours.closed}
                value={selectedHours.opens}
                onChange={(event) =>
                  editException({ opens: event.target.value })
                }
              />
              <input
                type="time"
                aria-label="Special closing time"
                className={inputClass}
                disabled={selectedHours.closed}
                value={selectedHours.closes}
                onChange={(event) =>
                  editException({ closes: event.target.value })
                }
              />
            </div>
            {exception && (
              <button
                type="button"
                className="text-violet mt-3 text-sm"
                onClick={() =>
                  setValue({
                    ...value,
                    exceptions: value.exceptions.filter(
                      (item) => item.date !== selected,
                    ),
                  })
                }
              >
                Remove exception — use weekly hours
              </button>
            )}
          </fieldset>
          <details className="text-muted mt-3 text-sm">
            <summary>{value.exceptions.length} date exceptions</summary>
            {value.exceptions.map((item) => (
              <button
                type="button"
                key={item.date}
                className="mt-2 block text-left"
                onClick={() => {
                  setSelected(item.date);
                  setMonth(item.date.slice(0, 7));
                }}
              >
                {item.date}:{" "}
                {item.hours.closed
                  ? "Closed"
                  : `${item.hours.opens}–${item.hours.closes}`}
              </button>
            ))}
          </details>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          disabled={pending}
          className="bg-violet rounded-xl px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {pending ? "Saving…" : "Save opening calendar"}
        </button>
        <p role="status" className="text-muted text-sm">
          {state.savedCalendar && state.savedCalendar !== JSON.stringify(value)
            ? "Unsaved changes — save to update the agent’s hours."
            : state.message}
        </p>
      </div>
    </form>
  );
}
