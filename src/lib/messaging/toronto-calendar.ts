import { promotrVenueFacts } from "@/config/venue-facts.v2";
import { parse } from "chrono-node";

export function getTorontoDateRequestContext(
  message: string,
  now = new Date(),
) {
  const offsetLabel =
    new Intl.DateTimeFormat("en-US", {
      timeZone: promotrVenueFacts.timezone,
      timeZoneName: "shortOffset",
    })
      .formatToParts(now)
      .find((part) => part.type === "timeZoneName")?.value || "";
  const offsetParts = offsetLabel.match(/GMT([+-])(\d{1,2})(?::(\d{2}))?/);
  const offset = offsetParts
    ? (offsetParts[1] === "-" ? -1 : 1) *
      (Number(offsetParts[2]) * 60 + Number(offsetParts[3] || 0))
    : 0;
  const reference = { instant: now, timezone: offset };
  // Keep future preference for ordinary requests, but reparse each explicitly
  // past expression separately: "last Saturday" must not become next Saturday.
  const results = parse(
    message.slice(0, 2000),
    reference,
    { forwardDate: true },
  ).map((result) => {
    if (!/\b(?:last|previous|ago|yesterday)\b/i.test(result.text))
      return result;
    const past = parse(result.text, reference, { forwardDate: false })[0];
    return past
      ? { ...result, start: past.start, end: past.end }
      : result;
  });
  const describe = (component: (typeof results)[number]["start"]) => {
    const year = component.get("year")!;
    const month = component.get("month")!;
    const day = component.get("day")!;
    const label = new Intl.DateTimeFormat("en-US", {
      timeZone: "UTC",
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    }).format(new Date(Date.UTC(year, month - 1, day, 12)));
    const iso = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const clock = component.isCertain("hour")
      ? `; local time ${String(component.get("hour")).padStart(2, "0")}:${String(component.get("minute")).padStart(2, "0")}`
      : "";
    const zone = component.isCertain("timezoneOffset")
      ? "; explicit guest timezone: do not treat this clock as Toronto local without conversion"
      : "; America/Toronto local date/time (not UTC)";
    let daylightSaving = "";
    if (component.isCertain("hour") && !component.isCertain("timezoneOffset")) {
      const wallClock = Date.UTC(
        year,
        month - 1,
        day,
        component.get("hour")!,
        component.get("minute") || 0,
      );
      const matchingInstants = [-300, -240].filter((candidateOffset) => {
        const parts = new Intl.DateTimeFormat("en-CA", {
          timeZone: promotrVenueFacts.timezone,
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
          hourCycle: "h23",
        }).formatToParts(new Date(wallClock - candidateOffset * 60000));
        const value = (type: string) =>
          Number(parts.find((part) => part.type === type)?.value);
        return (
          value("year") === year &&
          value("month") === month &&
          value("day") === day &&
          value("hour") === component.get("hour") &&
          value("minute") === (component.get("minute") || 0)
        );
      });
      if (!matchingInstants.length)
        daylightSaving =
          "; INVALID Toronto clock during spring daylight-saving transition: ask for another time";
      else if (matchingInstants.length > 1)
        daylightSaving =
          "; AMBIGUOUS repeated Toronto clock during autumn daylight-saving transition: clarify which occurrence";
    }
    return `${label} (${iso})${clock}${zone}${daylightSaving}`;
  };
  const dates = results.slice(0, 8).map((result) => {
    if (
      /^(?:every|each)\b/i.test(result.text) ||
      /\b(?:every|each)\s*$/i.test(message.slice(0, result.index))
    )
      return "Recurring schedule question: do not turn a recurring weekday into a single dated event; apply regular policy plus the relevant dated exceptions.";
    const ambiguousNumeric = /\b(\d{1,2})[/-](\d{1,2})(?:[/-]\d{2,4})?\b/.exec(
      result.text,
    );
    if (
      ambiguousNumeric &&
      Number(ambiguousNumeric[1]) <= 12 &&
      Number(ambiguousNumeric[2]) <= 12 &&
      ambiguousNumeric[1] !== ambiguousNumeric[2]
    )
      return `Ambiguous numeric date ${JSON.stringify(result.text)}: ask the guest for the month name before applying dated exceptions.`;
    if (/weekend/i.test(result.text))
      return `Weekend reference ${JSON.stringify(result.text)}: clarify Friday/Saturday/Sunday; do not assume a single event date.`;
    return `${JSON.stringify(result.text)} resolves to ${describe(result.start)}${result.end ? ` through ${describe(result.end)}` : ""}.`;
  });
  return `Resolved guest date/time references:\n${dates.join("\n") || "No deterministic date/time match; interpret carefully or ask for clarification, never invent a date."}\nBefore replying, compare these exact dates with dated published updates in EVERY category. A dated closure overrides regular weekday hours. Mention the resolved date naturally when answering a relative-date opening/booking question. If the wording has multiple plausible meanings, ask which date/time the guest means. A 10 PM-3 AM night ends on the following calendar day; after-midnight clock times may refer to the preceding venue night, so clarify when needed. Recurring weekday policies are not one-off dated exceptions.`;
}

const scheduledNights = new Set(["Thursday", "Friday", "Saturday"]);

function getTorontoCalendarFacts(now: Date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: promotrVenueFacts.timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    weekday: "long",
  }).formatToParts(now);
  const part = (type: string) =>
    parts.find((item) => item.type === type)?.value || "";
  const year = Number(part("year"));
  const month = Number(part("month"));
  const day = Number(part("day"));
  const today = new Date(Date.UTC(year, month - 1, day, 12));
  const tomorrow = new Date(today);
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  const dateLabel = (date: Date) =>
    new Intl.DateTimeFormat("en-US", {
      timeZone: "UTC",
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    }).format(date);
  const tomorrowWeekday = new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    weekday: "long",
  }).format(tomorrow);
  return {
    currentTime: `${part("hour")}:${part("minute")} ${part("dayPeriod")}`,
    todayLabel: dateLabel(today),
    tomorrowLabel: dateLabel(tomorrow),
    tomorrowWeekday,
    tomorrowIsScheduledNight: scheduledNights.has(tomorrowWeekday),
  };
}

export function getTorontoCalendarContext(now = new Date()) {
  const facts = getTorontoCalendarFacts(now);
  return `Authoritative Toronto calendar: today is ${facts.todayLabel} at ${facts.currentTime}; tomorrow is ${facts.tomorrowLabel}. This calendar establishes dates and clocks only, not opening hours. Determine opening hours from current approved venue information: apply an exception only to its exact date, then current recurring hours, then the regular playbook fallback. Never extend a single dated closure to another weekend. This does not confirm an event, table availability, or admission.`;
}

export function getDirectTorontoDateAnswer(message: string, now = new Date()) {
  const request = message.trim();
  const tomorrow = /\btomorrow\b/i.test(request);
  const today = /\btoday\b/i.test(request);
  if (!tomorrow && !today) return null;
  if (
    !/^(?:(?:what(?:'s| is)|which)\s+(?:the\s+)?(?:date|day)\s+(?:is\s+)?(?:it\s+)?(?:today|tomorrow)|(?:what(?:'s| is)|which)\s+(?:today|tomorrow)(?:'s)?\s+(?:date|day)|(?:today|tomorrow)(?:'s)?\s+(?:date|day))\??$/i.test(
      request,
    )
  )
    return null;
  const facts = getTorontoCalendarFacts(now);
  return `${tomorrow ? "Tomorrow" : "Today"} in Toronto is ${tomorrow ? facts.tomorrowLabel : facts.todayLabel}. 😊`;
}

export function getTomorrowBookingGuidance(message: string, now = new Date()) {
  if (
    !/\b(?:i|we)\s+(?:need|want|would\s+like)\s+to\s+(?:book|reserve)\b.{0,40}\btomorrow\b|\b(?:can|could|how\s+can)\s+(?:i|we)\s+(?:book|reserve)\b.{0,40}\btomorrow\b/i.test(
      message,
    )
  )
    return null;
  const facts = getTorontoCalendarFacts(now);
  if (facts.tomorrowIsScheduledNight)
    return {
      reply: `Tomorrow is ${facts.tomorrowLabel}, one of our regular nights (10 PM-3 AM). I can share the booking inquiry, but the venue team still needs to confirm availability.`,
      shareBookingForm: true,
    };
  return {
    reply: `Tomorrow is ${facts.tomorrowLabel}. We're normally closed on ${facts.tomorrowWeekday}s unless a special event is confirmed, and I don't have one confirmed. Is there a Thursday, Friday, or Saturday that works for you?`,
    shareBookingForm: false,
  };
}
