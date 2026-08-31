import { describe, expect, it } from "vitest";
import { promotrVenueFacts } from "@/config/venue-facts.v1";
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
});
