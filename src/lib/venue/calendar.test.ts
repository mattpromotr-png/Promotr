import { describe, expect, it } from "vitest";
import {
  defaultVenueCalendar,
  formatVenueCalendar,
  readVenueCalendar,
  resolveVenueNight,
  torontoDate,
  venueCalendarSchema,
} from "./calendar";

describe("venue opening calendar", () => {
  it("uses weekly hours and closes overnight on the following day", () => {
    expect(
      resolveVenueNight(defaultVenueCalendar(), "2026-10-02"),
    ).toMatchObject({
      closed: false,
      opens: "22:00",
      closes: "03:00",
      closesNextDay: true,
    });
    expect(resolveVenueNight(defaultVenueCalendar(), "2026-10-04").closed).toBe(
      true,
    );
  });
  it("applies closures to their exact date only", () => {
    const calendar = defaultVenueCalendar();
    calendar.exceptions.push({
      date: "2026-10-02",
      hours: { closed: true, opens: "22:00", closes: "03:00" },
    });
    expect(resolveVenueNight(calendar, "2026-10-02").closed).toBe(true);
    expect(resolveVenueNight(calendar, "2026-10-03").closed).toBe(false);
    expect(resolveVenueNight(calendar, "2026-10-09").closed).toBe(false);
    calendar.exceptions = [];
    expect(resolveVenueNight(calendar, "2026-10-02").closed).toBe(false);
  });
  it("opens a normally closed day with special hours", () => {
    const calendar = defaultVenueCalendar();
    calendar.exceptions.push({
      date: "2026-10-04",
      hours: { closed: false, opens: "18:00", closes: "23:00" },
    });
    expect(resolveVenueNight(calendar, "2026-10-04")).toMatchObject({
      closed: false,
      opens: "18:00",
      closesNextDay: false,
    });
  });
  it("validates real dates, clocks, complete weeks and unique exceptions", () => {
    const calendar = defaultVenueCalendar();
    expect(
      venueCalendarSchema.safeParse({ ...calendar, weekly: [] }).success,
    ).toBe(false);
    const item = { date: "2026-02-30", hours: calendar.weekly[0] };
    expect(
      venueCalendarSchema.safeParse({ ...calendar, exceptions: [item] })
        .success,
    ).toBe(false);
    item.date = "2026-10-02";
    expect(
      venueCalendarSchema.safeParse({ ...calendar, exceptions: [item, item] })
        .success,
    ).toBe(false);
    expect(
      venueCalendarSchema.safeParse({
        ...calendar,
        weekly: calendar.weekly.map(() => ({
          closed: false,
          opens: "25:00",
          closes: "03:00",
        })),
      }).success,
    ).toBe(false);
    expect(readVenueCalendar({})).toBeNull();
    expect(readVenueCalendar({ openingCalendar: calendar })).toEqual(calendar);
  });
  it("uses Toronto civil dates across midnight and DST", () => {
    expect(torontoDate(new Date("2026-09-27T02:00:00Z"))).toBe("2026-09-26");
    expect(torontoDate(new Date("2026-11-01T06:30:00Z"))).toBe("2026-11-01");
  });
  it("supplies exact far-future nights and priority to both model stages", () => {
    const calendar = defaultVenueCalendar();
    const result = formatVenueCalendar(
      calendar,
      "2027-01-01",
      new Date("2026-09-27T15:00:00Z"),
    );
    expect(result).toContain("2027-01-01: Open 22:00-03:00");
    expect(result).toContain("overrides opening/closing claims");
    expect(formatVenueCalendar(null, "2027-01-01")).toBe("");
  });
});
