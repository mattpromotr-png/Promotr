import { describe, expect, it } from "vitest";
import {
  buildBoundedContext,
  conversationalFallback,
  deterministicHandoff,
  parseAiHostResponse,
  SAFE_AI_FALLBACK,
} from "./orchestration";

describe("AI orchestration rules", () => {
  it("keeps only the latest ten short messages", () => {
    const messages = Array.from({ length: 12 }, (_, index) => ({
      direction: index % 2 ? ("inbound" as const) : ("outbound" as const),
      content: `message ${index}`,
    }));
    const context = buildBoundedContext(messages, "Known booking details");
    expect(context.messages).toHaveLength(10);
    expect(context.messages[0]?.content).toBe("message 2");
  });
  it("handles complaints without a model call", () => {
    const result = deterministicHandoff(
      "I was charged twice and want a refund",
    );
    expect(result).toMatchObject({
      intent: "complaint",
      handoffRequired: true,
      shareBookingForm: false,
    });
  });
  it("does not escalate harmless nightlife slang when the model is unavailable", () => {
    const text =
      "Me and the boys are tryna get absolutely after it and meet some broads";

    expect(deterministicHandoff(text)).toBeNull();
    expect(conversationalFallback(text)).toMatchObject({
      handoffRequired: false,
      shareBookingForm: false,
      bookingIntent: false,
    });
    expect(conversationalFallback(text).reply).not.toContain("broads");
  });
  it("rejects invalid model output with a safe handoff", () => {
    expect(parseAiHostResponse("not json")).toEqual(SAFE_AI_FALLBACK);
  });
  it("never accepts a handoff without a reason", () => {
    const result = parseAiHostResponse({
      reply: "One moment",
      intent: "other",
      bookingIntent: false,
      missingQualificationFields: [],
      shareBookingForm: false,
      handoffRequired: true,
      handoffReason: null,
    });
    expect(result).toEqual(SAFE_AI_FALLBACK);
  });
});
