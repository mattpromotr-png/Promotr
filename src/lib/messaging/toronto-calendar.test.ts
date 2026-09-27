import { describe, expect, it } from "vitest";

import {
  getDirectTorontoDateAnswer,
  getTorontoCalendarContext,
  getTorontoDateRequestContext,
  getTomorrowBookingGuidance,
} from "./toronto-calendar";

describe("authoritative Toronto calendar", () => {
  it("flags nonexistent and repeated Toronto daylight-saving clocks", () => {
    const now = new Date("2026-01-01T16:00:00Z");
    expect(
      getTorontoDateRequestContext("March 8, 2026 at 2:30 am", now),
    ).toContain("INVALID Toronto clock");
    expect(
      getTorontoDateRequestContext("November 1, 2026 at 1:30 am", now),
    ).toContain("AMBIGUOUS repeated Toronto clock");
    expect(
      getTorontoDateRequestContext("October 2, 2026 at 10 pm", now),
    ).not.toContain("INVALID");
  });
  it("resolves next Friday and October 2 to the same Toronto date", () => {
    const now = new Date("2026-09-26T14:00:00Z");
    expect(
      getTorontoDateRequestContext("Are you open next Friday?", now),
    ).toContain("Friday, October 2, 2026 (2026-10-02)");
    expect(
      getTorontoDateRequestContext("Are you open October 2nd?", now),
    ).toContain("Friday, October 2, 2026 (2026-10-02)");
    expect(
      getTorontoDateRequestContext("Are you open next Friday?", now),
    ).toContain("EVERY category");
  });

  it("uses the Toronto day at a UTC boundary and resolves explicit local clocks", () => {
    const now = new Date("2026-09-27T02:30:00Z");
    expect(getTorontoDateRequestContext("tomorrow at 1 am", now)).toContain(
      "Sunday, September 27, 2026",
    );
    expect(getTorontoDateRequestContext("tomorrow at 1 am", now)).toContain(
      "local time 01:00",
    );
    expect(getTorontoDateRequestContext("in two weeks", now)).toContain(
      "2026-10-10",
    );
  });

  it("handles year rollover and asks about ambiguous dates/weekends", () => {
    const now = new Date("2026-12-31T16:00:00Z");
    expect(getTorontoDateRequestContext("tomorrow at 10 pm", now)).toContain(
      "2027-01-01",
    );
    expect(getTorontoDateRequestContext("on 03/04", now)).toContain(
      "Ambiguous numeric date",
    );
    expect(getTorontoDateRequestContext("next weekend", now)).toContain(
      "clarify Friday/Saturday/Sunday",
    );
  });
  it("uses Toronto's local day rather than the server's UTC day", () => {
    const context = getTorontoCalendarContext(new Date("2026-09-22T02:30:00Z"));

    expect(context).toContain("today is Monday, September 21, 2026");
    expect(context).toContain("tomorrow is Tuesday, September 22, 2026");
    expect(context).toContain("dates and clocks only, not opening hours");
    expect(context).not.toContain("10 PM-3 AM");
    expect(context).toContain("Never extend a single dated closure");
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
