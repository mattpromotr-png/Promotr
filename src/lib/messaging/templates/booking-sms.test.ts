import { describe, expect, it } from "vitest";
import { renderBookingSms } from "@/lib/messaging/templates/booking-sms";

const base = {
  guestName: "Alex Morgan",
  bookingDate: "2026-10-10",
  arrivalTime: "22:30:00",
  manageUrl: "https://promotr.example/book/manage/1?token=test",
};

describe("booking SMS templates", () => {
  it("keeps an unpaid inquiry explicitly unconfirmed", () => {
    const message = renderBookingSms({
      ...base,
      eventType: "inquiry_received",
    });
    expect(message).toContain("not confirmed yet");
    expect(message).toContain("Reply STOP");
    expect(message).toContain(base.manageUrl);
  });

  it("includes the verified deposit amount and management link", () => {
    const message = renderBookingSms({
      ...base,
      eventType: "deposit_received",
      depositCad: 100,
    });
    expect(message).toContain("$100.00 CAD deposit");
    expect(message).toContain(base.manageUrl);
  });

  it("uses confirmation language only for the confirmed event", () => {
    const message = renderBookingSms({
      ...base,
      eventType: "booking_confirmed",
    });
    expect(message).toContain("is confirmed");
    expect(message).toContain("government-issued ID");
  });
});
