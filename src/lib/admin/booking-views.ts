export function selectedVenueDate(value?: string) {
  if (value && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const parsed = new Date(`${value}T00:00:00Z`);
    if (
      !Number.isNaN(parsed.getTime()) &&
      parsed.toISOString().slice(0, 10) === value
    ) {
      return value;
    }
  }
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Toronto",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export function reservationSource(lead: {
  status: string;
  booking_type: string;
  table_bookings?: { status: string } | { status: string }[] | null;
}) {
  const booking = Array.isArray(lead.table_bookings)
    ? lead.table_bookings[0]
    : lead.table_bookings;
  if (booking?.status === "confirmed") return "Deposit confirmed";
  if (lead.status !== "booked" || booking) return null;
  return lead.booking_type === "guest_list"
    ? "Guest list confirmed"
    : "Staff confirmed";
}
