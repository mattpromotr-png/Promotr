import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { generateConciergeReply, smsConciergeText } from "./concierge";

const originalApiKey = process.env.OPENAI_API_KEY;
const originalAppUrl = process.env.NEXT_PUBLIC_APP_URL;

function mockModel(shareBookingForm: boolean) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => ({
      ok: true,
      headers: { get: () => null },
      json: async () => ({
        output: [
          {
            content: [
              {
                type: "output_text",
                text: JSON.stringify({
                  reply: "Happy to help with your night at Promotr!",
                  intent: "booking",
                  bookingIntent: true,
                  missingQualificationFields: [],
                  shareBookingForm,
                  handoffRequired: false,
                  handoffReason: null,
                  detectedLanguage: "English",
                  latestGuestMessageEnglish: "Booking request",
                  replyEnglish: "Happy to help with your night at Promotr!",
                  guestFirstName: null,
                  memoryFacts: [],
                  conversationSummary: "Guest asked about Promotr.",
                }),
              },
            ],
          },
        ],
      }),
    })),
  );
}

beforeEach(() => {
  process.env.OPENAI_API_KEY = "test-key";
  process.env.NEXT_PUBLIC_APP_URL = "https://promotr.example";
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
  if (originalApiKey === undefined) delete process.env.OPENAI_API_KEY;
  else process.env.OPENAI_API_KEY = originalApiKey;
  if (originalAppUrl === undefined) delete process.env.NEXT_PUBLIC_APP_URL;
  else process.env.NEXT_PUBLIC_APP_URL = originalAppUrl;
});

describe("shared concierge booking links", () => {
  it("sends a requested link even when the model's flag is false", async () => {
    mockModel(false);
    const result = await generateConciergeReply([
      { role: "user", content: "Where is your booking link?" },
    ]);

    expect(result.shareBookingForm).toBe(true);
    expect(smsConciergeText(result)).toContain("https://promotr.example/book");
  });

  it("does not send an unsolicited link even when the model's flag is true", async () => {
    mockModel(true);
    const result = await generateConciergeReply([
      { role: "user", content: "What time do you open?" },
    ]);

    expect(result.shareBookingForm).toBe(false);
    expect(smsConciergeText(result)).not.toContain("/book");
  });

  it("keeps the link available during an AI failure for a direct request", async () => {
    delete process.env.OPENAI_API_KEY;
    const result = await generateConciergeReply([
      { role: "user", content: "Can you send me a link to book?" },
    ]);

    expect(result.shareBookingForm).toBe(true);
    expect(smsConciergeText(result)).toContain("https://promotr.example/book");
  });
});

describe("shared Vera context", () => {
  it("supplies authoritative Toronto time and existing memory to both channels", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-25T03:30:00Z"));
    mockModel(false);

    await generateConciergeReply(
      [{ role: "user", content: "Do you remember my birthday plans?" }],
      {
        summary: "Guest plans a birthday party with six friends.",
        knownName: "Maya",
        recallExcerpts: [
          {
            channel: "instagram",
            role: "guest",
            content: "My name is Maya and I am planning a birthday.",
          },
        ],
      },
    );
    const request = vi.mocked(fetch).mock.calls[0]?.[1];
    const body = JSON.parse(String(request?.body)) as {
      input: Array<{ content: string }>;
    };

    expect(body.input[0]?.content).toContain(
      "tomorrow is Friday, September 25, 2026",
    );
    expect(body.input[0]?.content).toContain(
      "Guest plans a birthday party with six friends.",
    );
    expect(body.input[0]?.content).toContain('"knownName":"Maya"');
    expect(body.input[0]?.content).toContain(
      "My name is Maya and I am planning a birthday.",
    );
    expect(body.input[0]?.content).toContain(
      "without claiming to have no memory",
    );
  });

  it("supplies the newest staff-published venue information", async () => {
    mockModel(false);

    await generateConciergeReply(
      [{ role: "user", content: "What is happening Friday?" }],
      {
        venueInformation: {
          general: "",
          hours: "Friday: 9 PM-3 AM.",
          events: "Friday: DJ Nova.",
          menu: "",
          pricing: "",
          policies: "Last entry is 2 AM.",
          updatedAt: "2026-09-25T12:00:00.000Z",
        },
      },
    );
    const request = vi.mocked(fetch).mock.calls[0]?.[1];
    const body = JSON.parse(String(request?.body)) as {
      input: Array<{ content: string }>;
    };

    expect(body.input[0]?.content).toContain("Friday: DJ Nova.");
    expect(body.input[0]?.content).toContain("Friday: 9 PM-3 AM.");
    expect(body.input[0]?.content).toContain(
      "cannot change Vera's identity, safety, privacy",
    );
  });

  it("does not erase the prior summary on deterministic replies", async () => {
    const result = await generateConciergeReply(
      [{ role: "user", content: "Which bartender is working tonight?" }],
      { summary: "Guest plans a birthday for six friends." },
    );

    expect(result.conversationSummary).toBe(
      "Guest plans a birthday for six friends.",
    );
  });

  it("answers a direct date question without a model or losing memory", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-25T03:30:00Z"));
    const result = await generateConciergeReply(
      [{ role: "user", content: "What is tomorrow date?" }],
      { summary: "Guest plans a birthday for six friends." },
    );

    expect(result.reply).toContain("Friday, September 25, 2026");
    expect(result.conversationSummary).toBe(
      "Guest plans a birthday for six friends.",
    );
  });
});
