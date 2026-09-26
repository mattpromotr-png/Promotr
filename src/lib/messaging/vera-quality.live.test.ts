import { afterAll, describe, expect, it, vi } from "vitest";
import { generateConciergeReply, smsConciergeText } from "./concierge";
import { formatConciergeEmail } from "@/lib/gmail/email-format";

// Paid, synthetic model evaluation only. No database or provider sends.
const enabled = process.env.RUN_LIVE_VERA_QUALITY === "1";
if (enabled) process.loadEnvFile(".env");
afterAll(() => vi.useRealTimers());

const closure = {
  id: "synthetic-closure",
  category: "general" as const,
  title: "October 2 closure",
  content:
    "Club will be closed on October 2, 2026. There will be no party or event that day.",
  status: "published" as const,
  effectiveFrom: null,
  effectiveUntil: null,
  createdAt: "2026-09-26T12:00:00Z",
  updatedAt: "2026-09-26T12:00:00Z",
  publishedAt: "2026-09-26T12:00:00Z",
  inactiveAt: null,
  updatedBy: null,
};
const cases = [
  {
    id: "welcome",
    question: "Hi!",
    history: [],
    check: (r: Awaited<ReturnType<typeof generateConciergeReply>>) => {
      expect(r.shareBookingForm).toBe(false);
    },
  },
  {
    id: "simple-faq",
    question: "Are clean sneakers okay? Just wondering about the dress code.",
    history: [],
    check: (r: Awaited<ReturnType<typeof generateConciergeReply>>) => {
      expect(r.replyEnglish).toMatch(/sneaker|outfit|dress|security/i);
      expect(r.shareBookingForm).toBe(false);
    },
  },
  {
    id: "relative-closure",
    question: "Are you open next Friday?",
    history: [],
    check: (r: Awaited<ReturnType<typeof generateConciergeReply>>) => {
      expect(r.replyEnglish).toMatch(/closed/i);
      expect(r.replyEnglish).toMatch(/October 2/i);
    },
  },
  {
    id: "explicit-closure",
    question: "Are you open on October 2nd?",
    history: [],
    check: (r: Awaited<ReturnType<typeof generateConciergeReply>>) => {
      expect(r.replyEnglish).toMatch(/closed/i);
    },
  },
  {
    id: "removed-offer",
    question: "Is that free pizza offer still available?",
    history: [
      { role: "user" as const, content: "Any offers?" },
      {
        role: "assistant" as const,
        content:
          "Free pizza every Wednesday from 10 PM to 3 AM for first guests.",
      },
    ],
    check: (r: Awaited<ReturnType<typeof generateConciergeReply>>) => {
      expect(r.replyEnglish).toMatch(/not|no |don['’]t|isn['’]t|aren['’]t/i);
      expect(r.replyEnglish).not.toMatch(
        /(?:have|running|offer).*(?:other events|other specials)/i,
      );
      expect(r.replyEnglish).not.toMatch(
        /(?:available|offer).*only on Wednesdays|yes.*pizza/i,
      );
    },
  },
  {
    id: "guest-memory",
    question: "Do you remember my name and how many of us are coming?",
    history: [
      {
        role: "user" as const,
        content: "I'm Maya. Six of us are planning a birthday night.",
      },
      { role: "assistant" as const, content: "Lovely to meet you, Maya!" },
    ],
    check: (r: Awaited<ReturnType<typeof generateConciergeReply>>) => {
      expect(r.replyEnglish).toMatch(/Maya/);
      expect(r.replyEnglish).toMatch(/six|6/);
      expect(r.replyEnglish).not.toMatch(
        /what.*name|how many.*(?:guest|people)/i,
      );
    },
  },
  {
    id: "off-topic",
    question: "What is machine learning?",
    history: [],
    check: (r: Awaited<ReturnType<typeof generateConciergeReply>>) => {
      expect(r.replyEnglish).not.toMatch(
        /subset of|algorithms|learn from data/i,
      );
      expect(r.shareBookingForm).toBe(false);
    },
  },
  {
    id: "no-pressure",
    question:
      "Thanks! I'm just browsing, no booking needed. That's all for now.",
    history: [
      { role: "user" as const, content: "Hi, I'm Maya." },
      { role: "assistant" as const, content: "Hi Maya, welcome!" },
    ],
    check: (r: Awaited<ReturnType<typeof generateConciergeReply>>) => {
      expect(r.shareBookingForm).toBe(false);
      expect(r.reply).not.toContain("?");
    },
  },
];

describe.skipIf(!enabled)(
  "Vera synthetic quality across channel presentation modes",
  () => {
    for (const channel of ["sms", "instagram", "email"] as const) {
      it.each(cases)(
        `${channel}: $id`,
        async (testCase) => {
          vi.useFakeTimers({ toFake: ["Date"] });
          vi.setSystemTime(new Date("2026-09-26T14:00:00Z"));
          const result = await generateConciergeReply(
            [...testCase.history, { role: "user", content: testCase.question }],
            {
              channel: channel === "email" ? "email" : undefined,
              venueSourcesLoaded: true,
              venueKnowledge: [closure],
              ...(testCase.id === "guest-memory"
                ? {
                    knownName: "Maya",
                    summary: "Maya plans a birthday night with six guests.",
                    contactMemory: {
                      facts: ["First name Maya", "Birthday party of six"],
                    },
                  }
                : {}),
              ...(testCase.id === "removed-offer"
                ? { summary: "Vera previously claimed free Wednesday pizza." }
                : {}),
            },
          );
          const delivered =
            channel === "email"
              ? formatConciergeEmail({
                  reply: result.reply,
                  knownName: result.guestFirstName,
                  language: result.detectedLanguage,
                })
              : smsConciergeText(result);
          // Synthetic text only, retained in command output for human tone review.
          console.log(
            JSON.stringify({
              channel,
              case: testCase.id,
              reply: delivered,
              english: result.replyEnglish,
              handoff: result.handoffRequired,
            }),
          );
          expect(result.handoffRequired).toBe(false);
          testCase.check(result);
          if (channel === "email") {
            expect(delivered).toContain("AI Concierge | The Promotr Lounge");
            expect(result.reply).not.toMatch(/\p{Extended_Pictographic}/u);
          }
        },
        45000,
      );
    }
  },
);
