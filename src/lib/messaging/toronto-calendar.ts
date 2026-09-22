import { promotrVenueFacts } from "@/config/venue-facts.v2";

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
  const tomorrowSchedule = facts.tomorrowIsScheduledNight
    ? "Tomorrow is a regular scheduled venue night (10 PM-3 AM Eastern); this does not confirm an event, table availability, or admission."
    : "Tomorrow is outside regular venue hours; a special event is possible only if separately confirmed. Do not claim one is scheduled.";

  return `Authoritative Toronto calendar: today is ${facts.todayLabel} at ${facts.currentTime}; tomorrow is ${facts.tomorrowLabel}. ${tomorrowSchedule}`;
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
