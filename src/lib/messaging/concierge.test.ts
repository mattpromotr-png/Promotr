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
  it("keeps old pizza claims as historical context, not current venue evidence", async () => {
    mockModel(false);
    await generateConciergeReply(
      [
        {
          role: "assistant",
          content: "Free pizza on Wednesdays from 10 PM to 3 AM.",
        },
        { role: "user", content: "Is the pizza offer still available?" },
      ],
      {
        knownName: "Maya",
        summary: "Guest likes pizza. Previously told free pizza on Wednesday.",
      },
    );
    const body = JSON.parse(String(vi.mocked(fetch).mock.calls[0]?.[1]?.body));
    const prompt = body.input[0].content;
    expect(prompt).toContain(
      "Removed, inactive, or expired offers must not be revived from history",
    );
    expect(prompt).toContain(
      "do not restore deleted updates from conversation history",
    );
    expect(prompt).toContain(
      "Historical guest context (not a current venue-fact source",
    );
    expect(prompt).toContain('"knownName":"Maya"');
    expect(prompt).toContain("never venue offers or operational facts");
  });

  it("filters inactive, draft, expired, and future updates at the shared boundary", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-26T12:00:00Z"));
    mockModel(false);
    const base = {
      id: "test",
      category: "pricing" as const,
      title: "Offer",
      content: "Approved active offer",
      effectiveFrom: null,
      effectiveUntil: null,
      status: "published" as const,
      createdAt: "2026-09-25T12:00:00Z",
      updatedAt: "2026-09-25T12:00:00Z",
      publishedAt: "2026-09-25T12:00:00Z",
      inactiveAt: null,
      updatedBy: null,
    };
    await generateConciergeReply([{ role: "user", content: "Any offers?" }], {
      venueKnowledge: [
        base,
        {
          ...base,
          id: "inactive",
          status: "inactive",
          content: "Inactive pizza",
        },
        { ...base, id: "draft", status: "draft", content: "Draft pizza" },
        {
          ...base,
          id: "expired",
          effectiveUntil: "2026-09-26T11:00:00Z",
          content: "Expired pizza",
        },
        {
          ...base,
          id: "future",
          effectiveFrom: "2026-09-27T12:00:00Z",
          content: "Future pizza",
        },
      ],
    });
    const body = JSON.parse(String(vi.mocked(fetch).mock.calls[0]?.[1]?.body));
    expect(body.input[0].content).toContain("Approved active offer");
    for (const text of [
      "Inactive pizza",
      "Draft pizza",
      "Expired pizza",
      "Future pizza",
    ])
      expect(body.input[0].content).not.toContain(text);
  });

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

  it("supplies active knowledge cards without changing protected rules", async () => {
    mockModel(false);

    await generateConciergeReply(
      [{ role: "user", content: "What drinks are available tonight?" }],
      {
        venueKnowledge: [
          {
            id: "knowledge-id",
            category: "menu",
            title: "Tonight's drink selection",
            content: "Only champagne is available tonight.",
            effectiveFrom: null,
            effectiveUntil: null,
            status: "published",
            createdAt: "2026-09-25T12:00:00.000Z",
            updatedAt: "2026-09-25T12:00:00.000Z",
            publishedAt: "2026-09-25T12:00:00.000Z",
            inactiveAt: null,
            updatedBy: "manager",
          },
        ],
      },
    );
    const request = vi.mocked(fetch).mock.calls[0]?.[1];
    const body = JSON.parse(String(request?.body)) as {
      input: Array<{ content: string }>;
    };

    expect(body.input[0]?.content).toContain(
      "Only champagne is available tonight.",
    );
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
