import { describe, expect, it } from "vitest";
import { deterministicReply, toPublicReply } from "./ai";

describe("AI host safety", () => {
  it("handles complaints deterministically", () => {
    const result = deterministicReply(
      "Security was rude and I was charged twice",
    );
    expect(result?.intent).toBe("complaint");
    expect(result?.handoffRequired).toBe(true);
    expect(result?.shareBookingForm).toBe(false);
  });

  it("never trusts a model-provided URL", () => {
    const publicReply = toPublicReply(
      {
        reply: "Use https://malicious.example now",
        intent: "booking",
        bookingIntent: true,
        missingQualificationFields: [],
        shareBookingForm: true,
        handoffRequired: false,
        handoffReason: null,
      },
      "https://trusted.example/book",
    );
    expect(publicReply.reply).not.toContain("malicious.example");
    expect(publicReply.bookingUrl).toBe("https://trusted.example/book");
  });

  it("blocks false booking confirmations", () => {
    const publicReply = toPublicReply(
      {
        reply: "Your table is confirmed!",
        intent: "table",
        bookingIntent: true,
        missingQualificationFields: [],
        shareBookingForm: true,
        handoffRequired: false,
        handoffReason: null,
      },
      "https://trusted.example/book",
    );
    expect(publicReply.reply).toContain("inquiry");
    expect(publicReply.bookingUrl).toBeNull();
    expect(publicReply.handoffRequired).toBe(true);
  });
});
