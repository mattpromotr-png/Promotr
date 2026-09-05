import { describe, expect, it } from "vitest";
import { promotrVenueFacts } from "@/config/venue-facts.v1";
import { instagramHostBehavior } from "@/prompts/instagram-host.v1";
import fixtureData from "../../../tests/fixtures/ai-host-cases.json";
import { aiHostResponseSchema, finalizeAiReply } from "./contract";

type Fixture = {
  name: string;
  output: unknown;
  contains: string[];
};

const fixtures = fixtureData as Fixture[];

describe("AI host acceptance fixtures", () => {
  it.each(fixtures)("validates $name", ({ output, contains }) => {
    const parsed = aiHostResponseSchema.parse(output);
    for (const fragment of contains) expect(parsed.reply).toContain(fragment);
    expect((parsed.reply.match(/\?/g) ?? []).length).toBeLessThanOrEqual(1);
    expect(parsed.reply).not.toMatch(/https?:\/\//i);
    expect(parsed.reply).not.toMatch(
      /(?:booking|reservation|table) (?:is )?confirmed/i,
    );
  });

  it("appends the trusted URL only after qualification", () => {
    const qualified = aiHostResponseSchema.parse(
      fixtures.find(
        (fixture) => fixture.name === "qualified inquiry shares form",
      )?.output,
    );
    const reply = finalizeAiReply(qualified, "https://promotr.example/book");
    expect(reply).toContain("https://promotr.example/book");
    expect(reply).not.toContain("confirmed booking");
  });

  it("keeps every contract-critical venue fact in structured configuration", () => {
    expect(promotrVenueFacts).toMatchObject({
      location: "Downtown Toronto",
      minimumAge: 19,
      hours: { friday: "10:00 PM–3:00 AM", saturday: "10:00 PM–3:00 AM" },
      entry: {
        before11Pm: { amount: 20 },
        after11Pm: { amount: 30 },
        admissionGuaranteed: false,
      },
      guestList: {
        recommendedArrival: "before 11:00 PM",
        immediateEntryGuaranteed: false,
      },
      bottleService: {
        startingPrices: { standardVodka: 350, premiumChampagne: 600 },
      },
    });
    expect(promotrVenueFacts.dressCode.notAllowed).toContain("athletic wear");
    expect(promotrVenueFacts.unavailableFacts).toContain("live availability");
  });

  it("requires guest-language replies without weakening safety", () => {
    expect(instagramHostBehavior).toContain(
      "language of the guest's latest message",
    );
    expect(instagramHostBehavior).toContain(
      "Apply every accuracy, safety, privacy, qualification, and handoff rule equally",
    );
  });

  it.each([
    ["French", "Nous sommes ouverts le vendredi et le samedi, de 22 h à 3 h."],
    ["Spanish", "Abrimos los viernes y sábados de 10 p. m. a 3 a. m."],
    ["German", "Wir haben freitags und samstags von 22 bis 3 Uhr geöffnet."],
    ["Portuguese", "Abrimos às sextas e aos sábados, das 22h às 3h."],
  ])("accepts a safe %s guest-facing reply", (_language, reply) => {
    expect(
      aiHostResponseSchema.parse({
        reply,
        intent: "faq",
        bookingIntent: false,
        missingQualificationFields: [],
        shareBookingForm: false,
        handoffRequired: false,
        handoffReason: null,
      }).reply,
    ).toBe(reply);
  });
});
