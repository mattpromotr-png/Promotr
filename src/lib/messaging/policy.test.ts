import { describe, expect, it } from "vitest";
import { latestMessageAllowsBookingLink } from "@/lib/messaging/policy";

describe("SMS booking-link policy", () => {
  it("allows direct booking requests", () => {
    expect(latestMessageAllowsBookingLink("I need to book a party")).toBe(true);
    expect(latestMessageAllowsBookingLink("Send the booking link")).toBe(true);
  });

  it("does not turn later venue questions into booking CTAs", () => {
    expect(latestMessageAllowsBookingLink("What is the table price?")).toBe(
      false,
    );
    expect(latestMessageAllowsBookingLink("What music do you play?")).toBe(
      false,
    );
  });
});
