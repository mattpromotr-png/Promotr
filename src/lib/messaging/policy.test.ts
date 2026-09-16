import { describe, expect, it } from "vitest";
import {
  conversationAllowsBookingLink,
  conversationNeedsLostFoundForm,
  latestMessageAllowsBookingLink,
  latestMessageNeedsLostFoundForm,
  requiresStaffAttention,
} from "@/lib/messaging/policy";

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

  it("does not repeat a recently shared booking form", () => {
    expect(
      conversationAllowsBookingLink([
        { role: "user", content: "I want to book a party" },
        {
          role: "assistant",
          content: "Booking inquiry: https://promotr.example/book",
        },
        { role: "user", content: "I want to reserve a table" },
      ]),
    ).toBe(false);
    expect(
      conversationAllowsBookingLink([
        {
          role: "assistant",
          content: "Booking inquiry: https://promotr.example/book",
        },
        { role: "user", content: "Please send the booking link again" },
      ]),
    ).toBe(true);
  });
});

describe("SMS lost-and-found policy", () => {
  it("recognizes specific lost-item messages", () => {
    expect(latestMessageNeedsLostFoundForm("I lost my watch at the club")).toBe(
      true,
    );
    expect(
      latestMessageNeedsLostFoundForm("Do you have a lost and found?"),
    ).toBe(true);
    expect(
      latestMessageNeedsLostFoundForm("I am lost, where is the club?"),
    ).toBe(false);
  });

  it("does not repeat a recently shared lost-item form", () => {
    expect(
      conversationNeedsLostFoundForm([
        {
          role: "assistant",
          content: "Lost-item report: https://example.com/lost-found",
        },
        { role: "user", content: "I lost my phone" },
      ]),
    ).toBe(false);
    expect(
      conversationNeedsLostFoundForm([
        {
          role: "assistant",
          content: "Lost-item report: https://example.com/lost-found",
        },
        { role: "user", content: "Please send the lost item link again" },
      ]),
    ).toBe(true);
  });
});

describe("SMS staff-attention policy", () => {
  it("escalates direct staff and urgent safety requests", () => {
    expect(requiresStaffAttention("Can I speak to an admin directly?")).toBe(
      true,
    );
    expect(requiresStaffAttention("This is urgent, please help now")).toBe(
      true,
    );
    expect(
      requiresStaffAttention("I was charged twice and need a refund"),
    ).toBe(true);
  });

  it("does not escalate ordinary venue questions", () => {
    expect(requiresStaffAttention("What music do you play?")).toBe(false);
    expect(requiresStaffAttention("What time do you open?")).toBe(false);
  });
});
