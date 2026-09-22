import { describe, expect, it } from "vitest";

import { reservationSource, selectedVenueDate } from "./booking-views";

describe("admin booking views", () => {
  it("accepts real dates and falls back for impossible dates", () => {
    expect(selectedVenueDate("2026-02-28")).toBe("2026-02-28");
    expect(selectedVenueDate("2026-02-30")).not.toBe("2026-02-30");
  });

  it("shows only staff-booked or deposit-confirmed reservations", () => {
    expect(
      reservationSource({ status: "new", booking_type: "guest_list" }),
    ).toBeNull();
    expect(
      reservationSource({ status: "booked", booking_type: "guest_list" }),
    ).toBe("Guest list confirmed");
    expect(reservationSource({ status: "booked", booking_type: "table" })).toBe(
      "Staff confirmed",
    );
    expect(
      reservationSource({
        status: "booked",
        booking_type: "table",
        table_bookings: { status: "confirmed" },
      }),
    ).toBe("Deposit confirmed");
    expect(
      reservationSource({
        status: "pending",
        booking_type: "table",
        table_bookings: { status: "confirmed" },
      }),
    ).toBe("Deposit confirmed");
  });

  it.each(["held", "cancelled", "refunded", "expired"])(
    "excludes a table booking with %s status even if its inquiry remains Booked",
    (status) => {
      expect(
        reservationSource({
          status: "booked",
          booking_type: "table",
          table_bookings: [{ status }],
        }),
      ).toBeNull();
    },
  );
});
