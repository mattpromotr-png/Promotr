import { describe, expect, it } from "vitest";

import {
  getDirectTorontoDateAnswer,
  getTorontoCalendarContext,
  getTomorrowBookingGuidance,
} from "./toronto-calendar";

describe("authoritative Toronto calendar", () => {
  it("uses Toronto's local day rather than the server's UTC day", () => {
    const context = getTorontoCalendarContext(new Date("2026-09-22T02:30:00Z"));

    expect(context).toContain("today is Monday, September 21, 2026");
    expect(context).toContain("tomorrow is Tuesday, September 22, 2026");
    expect(context).toContain("outside regular venue hours");
  });

  it("handles an overnight Thursday-to-Friday request without promising availability", () => {
    const context = getTorontoCalendarContext(new Date("2026-09-25T03:30:00Z"));

    expect(context).toContain("today is Thursday, September 24, 2026");
    expect(context).toContain("tomorrow is Friday, September 25, 2026");
    expect(context).toContain(
      "does not confirm an event, table availability, or admission",
    );
  });

  it("answers a direct date question without relying on a model", () => {
    const now = new Date("2026-09-25T03:30:00Z");

    expect(getDirectTorontoDateAnswer("What is tomorrow date?", now)).toContain(
      "Friday, September 25, 2026",
    );
    expect(getDirectTorontoDateAnswer("What is today date?", now)).toContain(
      "Thursday, September 24, 2026",
    );
    expect(getDirectTorontoDateAnswer("Can I book tomorrow?", now)).toBeNull();
  });

  it("does not offer a normal booking on a closed weekday", () => {
    const result = getTomorrowBookingGuidance(
      "I need to book tomorrow",
      new Date("2026-09-22T02:30:00Z"),
    );

    expect(result?.reply).toContain("Tuesday, September 22, 2026");
    expect(result?.reply).toContain("normally closed");
    expect(result?.shareBookingForm).toBe(false);
  });

  it("allows an inquiry on a regular night without confirming availability", () => {
    const result = getTomorrowBookingGuidance(
      "Can I book tomorrow?",
      new Date("2026-09-25T03:30:00Z"),
    );

    expect(result?.reply).toContain("Friday, September 25, 2026");
    expect(result?.reply).toContain("needs to confirm availability");
    expect(result?.shareBookingForm).toBe(true);
    expect(
      getTomorrowBookingGuidance("I don't want to book tomorrow"),
    ).toBeNull();
  });
});
