import { describe, expect, it } from "vitest";
import { aiHostResponseSchema, finalizeAiReply, type AiHostResponse } from "./contract";

const output = {
  reply: "Absolutely 🎉 What night are you thinking?",
  intent: "guest_list",
  bookingIntent: true,
  missingQualificationFields: ["date"],
  shareBookingForm: false,
  handoffRequired: false,
  handoffReason: null,
} satisfies AiHostResponse;
describe("AI response contract", () => {
  it("accepts a safe structured response", () =>
    expect(aiHostResponseSchema.safeParse(output).success).toBe(true));
  it("requires a handoff reason", () =>
    expect(
      aiHostResponseSchema.safeParse({ ...output, handoffRequired: true })
        .success,
    ).toBe(false));
  it("appends only the configured booking URL", () =>
    expect(
      finalizeAiReply(
        { ...output, reply: "Use https://wrong.test", shareBookingForm: true },
        "https://promotr.test/book",
      ),
    ).toContain("https://promotr.test/book"));
});
