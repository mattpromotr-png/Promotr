import { z } from "zod";

export const WEEKDAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;
const clock = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);
const hours = z
  .object({ closed: z.boolean(), opens: clock, closes: clock })
  .refine(
    (value) => value.closed || value.opens !== value.closes,
    "Opening and closing times must differ.",
  );
export const venueCalendarSchema = z.object({
  weekly: z.array(hours).length(7),
  exceptions: z
    .array(
      z.object({
        date: z.string().date(),
        hours,
      }),
    )
    .max(120)
    .refine(
      (items) => new Set(items.map((item) => item.date)).size === items.length,
      "Each date can have only one exception.",
    ),
});
export type VenueCalendar = z.infer<typeof venueCalendarSchema>;

export function defaultVenueCalendar(): VenueCalendar {
  return {
    weekly: WEEKDAYS.map((_, index) => ({
      closed: index < 4,
      opens: "22:00",
      closes: "03:00",
    })),
    exceptions: [],
  };
}

export function readVenueCalendar(facts: unknown): VenueCalendar | null {
  const value =
    facts && typeof facts === "object" && "openingCalendar" in facts
      ? facts.openingCalendar
      : null;
  const parsed = venueCalendarSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

export function resolveVenueNight(calendar: VenueCalendar, date: string) {
  const valid = z.string().date().safeParse(date);
  if (!valid.success) throw new Error("Invalid venue night date.");
  const exception = calendar.exceptions.find((item) => item.date === date);
  const weekday = new Date(`${date}T12:00:00Z`).getUTCDay();
  const selected = exception?.hours || calendar.weekly[weekday];
  return {
    ...selected,
    date,
    exception: Boolean(exception),
    closesNextDay: !selected.closed && selected.closes < selected.opens,
  };
}

export function torontoDate(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Toronto",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const part = (type: string) =>
    parts.find((item) => item.type === type)?.value;
  return `${part("year")}-${part("month")}-${part("day")}`;
}

function describe(hours: VenueCalendar["weekly"][number]) {
  return hours.closed
    ? "Closed"
    : `Open ${hours.opens}-${hours.closes}${hours.closes < hours.opens ? " (closes on the following day)" : ""}`;
}

export function formatVenueCalendar(
  calendar: VenueCalendar | null | undefined,
  dateContext: string,
  now = new Date(),
) {
  if (!calendar) return "";
  const dates = new Set(dateContext.match(/\b\d{4}-\d{2}-\d{2}\b/g) || []);
  const start = new Date(`${torontoDate(now)}T12:00:00Z`);
  for (let index = 0; index < 14; index++) {
    const date = new Date(start);
    date.setUTCDate(date.getUTCDate() + index);
    dates.add(date.toISOString().slice(0, 10));
  }
  return [
    "AUTHORITATIVE OPENING CALENDAR — America/Toronto. This saved calendar overrides opening/closing claims in playbooks, free-text updates and history. Exceptions override weekly hours only on their exact venue-night date. Other venue facts still apply. Hours never guarantee admission or table availability. A closing time earlier than opening is on the following day; after-midnight visits may belong to the preceding venue night. Ask for clarification for ambiguous dates.",
    "Weekly hours:",
    ...calendar.weekly.map(
      (hours, index) => `${WEEKDAYS[index]}: ${describe(hours)}`,
    ),
    "Date exceptions (an unlisted date uses weekly hours, not automatically closed):",
    ...calendar.exceptions.map(
      (item) => `${item.date}: ${describe(item.hours)}`,
    ),
    "Server-resolved venue nights:",
    ...Array.from(dates)
      .sort()
      .map((date) => {
        const night = resolveVenueNight(calendar, date);
        return `${date}: ${describe(night)} (${night.exception ? "date exception" : "weekly schedule"})`;
      }),
  ].join("\n");
}
