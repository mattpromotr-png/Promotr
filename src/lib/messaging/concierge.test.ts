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
