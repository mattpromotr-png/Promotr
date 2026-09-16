import { describe, expect, it } from "vitest";
import { promotrVenueFacts } from "@/config/venue-facts.v2";
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

  it("keeps every PDF-critical venue fact in structured configuration", () => {
    expect(promotrVenueFacts).toMatchObject({
      name: "The Promotr Lounge",
      address: "123 King Street West, Toronto, Ontario",
      minimumAge: 19,
      hours: {
        thursday: "10:00 PM-3:00 AM",
        friday: "10:00 PM-3:00 AM",
        saturday: "10:00 PM-3:00 AM",
      },
      entry: { generalCoverCad: 20, admissionGuaranteed: false },
      guestList: { coverCad: 0, admissionGuaranteed: false },
      tables: {
        highTop: { minimumSpendCad: 500, includedEntryUpTo: 5 },
        booth: { minimumSpendCad: 1500, includedEntryUpTo: 10 },
      },
    });
    expect(promotrVenueFacts.dressCode.notAllowed).toContain("sports jerseys");
    expect(promotrVenueFacts.neverInvent).toContain("live availability");
  });

  it("requires guest-language replies without weakening accuracy", () => {
    expect(instagramHostBehavior).toContain(
      "language of the guest's latest message",
    );
    expect(instagramHostBehavior).toContain(
      "Never invent facts, availability, events, DJs, prices",
    );
  });

  it.each([
    [
      "French",
      "Nous sommes ouverts le jeudi, vendredi et samedi, de 22 h à 3 h.",
    ],
    ["Spanish", "Abrimos jueves, viernes y sábado de 10 p. m. a 3 a. m."],
    ["German", "Wir haben donnerstags bis samstags von 22 bis 3 Uhr geöffnet."],
    ["Portuguese", "Abrimos de quinta a sábado, das 22h às 3h."],
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
