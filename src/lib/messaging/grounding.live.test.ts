import { describe, expect, it } from "vitest";
import { groundVenueReply } from "./grounding";
import {
  getTorontoDateRequestContext,
  getTorontoCalendarContext,
} from "./toronto-calendar";

// Explicit opt-in only: uses paid API calls with synthetic data, no database.
const enabled = process.env.RUN_LIVE_GROUNDING === "1";
if (enabled) process.loadEnvFile(".env");

describe.skipIf(!enabled)("live venue grounding with synthetic offers", () => {
  it("does not volunteer irrelevant past party details in a simple hours answer", async () => {
    const result = await groundVenueReply({
      question: "What time do you open Saturday?",
      reply: "We open at 10 PM on Saturdays.",
      replyEnglish: "We open at 10 PM on Saturdays.",
      language: "English",
      email: false,
      sourcesLoaded: true,
      sources: "Regular opening hours Thursday-Saturday 10 PM-3 AM.",
      guestContext: {
        knownName: "Maya",
        personalFacts: [
          "Previously planned a party of six",
          "Guest previously asked about free pizza",
        ],
        historicalSummary: "A past birthday plan with six guests.",
        guestStatements: ["What time do you open Saturday?"],
        recalledGuestStatements: [],
      },
    });
    expect(result.replyEnglish).toMatch(/10\s*(?:PM|p\.m\.)/i);
    expect(result.replyEnglish).not.toMatch(/six|birthday|pizza/i);
  }, 30000);
  it("uses a current guest correction over an old party size", async () => {
    const result = await groundVenueReply({
      question: "Actually eight of us now. How many did I say?",
      reply: "You said six guests, Maya!",
      replyEnglish: "You said six guests, Maya!",
      sources: "Regular opening hours Thursday-Saturday, 10 PM-3 AM.",
      sourcesLoaded: true,
      email: false,
      language: "English",
      guestContext: {
        knownName: "Maya",
        personalFacts: ["Party size six"],
        historicalSummary: "Maya previously planned six guests.",
        guestStatements: [
          "We used to be six, but actually eight of us now. How many did I say?",
        ],
        recalledGuestStatements: [],
      },
    });
    expect(result.replyEnglish).toMatch(/eight|8/i);
    expect(result.replyEnglish).not.toMatch(
      /(?:you said|coming|party of) six/i,
    );
  }, 30000);
  it("does not restore an offer from guest memory or invent replacement specials", async () => {
    const result = await groundVenueReply({
      question: "Still free pizza?",
      reply: "Yes, free Wednesday pizza. We also have other specials!",
      replyEnglish: "Yes, free Wednesday pizza. We also have other specials!",
      sources: "No currently published offers.",
      sourcesLoaded: true,
      email: false,
      language: "English",
      guestContext: {
        knownName: "Maya",
        personalFacts: ["Guest says free Wednesday pizza exists"],
        historicalSummary: "Previously told free pizza on Wednesdays.",
        guestStatements: ["Still free pizza?"],
        recalledGuestStatements: [],
      },
    });
    expect(result.replyEnglish).toMatch(/no |not|isn['’]t|don['’]t/i);
    expect(result.replyEnglish).not.toMatch(
      /(?:have|offer|running).*(?:other specials|other events|free pizza every)/i,
    );
  }, 30000);
  it("applies an October 2 closure when the guest asks next Friday", async () => {
    const now = new Date("2026-09-26T14:00:00Z");
    const result = await groundVenueReply({
      question: "Are you open next Friday?",
      reply: "Yes, Friday we open from 10 PM to 3 AM!",
      replyEnglish: "Yes, Friday we open from 10 PM to 3 AM!",
      language: "English",
      email: false,
      sourcesLoaded: true,
      sources: `${getTorontoCalendarContext(now)}\n${getTorontoDateRequestContext("Are you open next Friday?", now)}\nRegular hours Thursday-Saturday 10 PM-3 AM.\nCurrent active General update: Club will be closed on October 2nd. No party that day.`,
    });
    expect(result.corrected).toBe(true);
    expect(result.replyEnglish).toMatch(/closed/i);
    expect(result.replyEnglish).toMatch(/October 2|October 2nd/i);
  }, 30000);
  const candidate = {
    question: "Is the free pizza offer still available?",
    reply:
      "Yes, free pizza every Wednesday from 10 PM to 3 AM for first guests!",
    replyEnglish:
      "Yes, free pizza every Wednesday from 10 PM to 3 AM for first guests!",
    language: "English",
    sourcesLoaded: true,
    email: false,
  };
  it("corrects historical pizza terms when current sources contain no offer", async () => {
    const result = await groundVenueReply({
      ...candidate,
      sources:
        "Full bar and food are available. Regular hours Thursday-Saturday 10 PM-3 AM. No published offers.",
    });
    expect(result.corrected).toBe(true);
    expect(result.replyEnglish).toMatch(
      /no current|not currently|no.*offer|not available|isn't.*offer|don't.*offer/i,
    );
    expect(result.replyEnglish).not.toMatch(
      /wednesday.*(?:10|available|offer)|can't confirm|cannot confirm/i,
    );
  }, 30000);
  it("honours an explicit cancellation despite the affirmative draft", async () => {
    const result = await groundVenueReply({
      ...candidate,
      sources:
        "Current published menu update: Free pizza has ended. No Wednesday parties. Regular hours Thursday-Saturday.",
    });
    expect(result.corrected).toBe(true);
    expect(result.replyEnglish).toMatch(
      /ended|no longer|not.*available|no current|don['’]t have.*offer.*(?:now|currently)|isn['’]t.*(?:running|available)/i,
    );
  }, 30000);
  it("retains an offer when current approved sources actually confirm it", async () => {
    const result = await groundVenueReply({
      ...candidate,
      sources:
        "Current active promotion: Free pizza every Wednesday from 10 PM to 3 AM for first guests. This special event overrides regular hours.",
    });
    expect(result.replyEnglish).toMatch(/wednesday/i);
    expect(result.replyEnglish).not.toMatch(
      /not available|no current|no longer/i,
    );
  }, 30000);
});
