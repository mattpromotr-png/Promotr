import { describe, expect, it } from "vitest";
import { bookingInquirySchema } from "./booking";

const valid = {
  idempotencyKey: "0d70ec55-a913-4d9c-892e-8a105d73197b",
  name: "Sarah Johnson",
  email: "sarah@example.com",
  phone: "",
  instagramHandle: "@sarah",
  requestedDate: "2099-05-17",
  preferredArrivalTime: "23:00",
  partySize: 6,
  occasion: "Birthday",
  bookingType: "guest_list" as const,
  bottlePreference: "",
  notes: "",
  consent: true,
  website: "",
};

describe("bookingInquirySchema", () => {
  it("accepts a valid inquiry with one contact method", () =>
    expect(bookingInquirySchema.safeParse(valid).success).toBe(true));
  it("accepts empty optional conversation and table identifiers", () =>
    expect(
      bookingInquirySchema.safeParse({
        ...valid,
        conversationId: "",
        tableId: "",
      }).success,
    ).toBe(true));
  it("requires email or phone", () =>
    expect(
      bookingInquirySchema.safeParse({ ...valid, email: "", phone: "" })
        .success,
    ).toBe(false));
  it("requires a bottle preference for table inquiries", () =>
    expect(
      bookingInquirySchema.safeParse({
        ...valid,
        bookingType: "table",
        bottlePreference: "",
      }).success,
    ).toBe(false));
  it("rejects dates in the past", () =>
    expect(
      bookingInquirySchema.safeParse({ ...valid, requestedDate: "2020-01-01" })
        .success,
    ).toBe(false));
});
