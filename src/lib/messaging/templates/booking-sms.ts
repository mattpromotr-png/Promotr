import type { BookingSmsTemplateInput } from "@/lib/messaging/contract";

function firstName(name: string) {
  return name.trim().split(/\s+/)[0] || "Guest";
}

function details(input: BookingSmsTemplateInput) {
  const time = input.arrivalTime ? ` at ${input.arrivalTime.slice(0, 5)}` : "";
  return `${input.bookingDate}${time}`;
}

function withLink(
  message: string,
  manageUrl?: string | null,
  includeOptOut = false,
) {
  const linked = manageUrl ? `${message} Manage: ${manageUrl}` : message;
  return includeOptOut ? `${linked} Reply STOP to opt out.` : linked;
}

export function renderBookingSms(input: BookingSmsTemplateInput) {
  const guest = firstName(input.guestName);
  const when = details(input);
  switch (input.eventType) {
    case "inquiry_received":
      return withLink(
        `Promotr: Hey ${guest}! We got your party request for ${when}. Our team will check availability and get back to you. It is not confirmed yet.`,
        input.manageUrl,
        true,
      );
    case "deposit_received":
      return withLink(
        `Promotr: You're all set, ${guest}! We received your $${Number(input.depositCad || 0).toFixed(2)} CAD deposit for ${when}. Our team is now processing your booking.`,
        input.manageUrl,
        true,
      );
    case "guest_updated":
      return withLink(
        `Promotr: Your plans are updated for ${when}. Our team will recheck the details and contact you if anything else is needed.`,
        input.manageUrl,
      );
    case "admin_updated":
      return withLink(
        `Promotr: We updated your booking details for ${when}. Please take a moment to review the latest information.`,
        input.manageUrl,
      );
    case "booking_confirmed":
      return withLink(
        `Promotr: Great news, ${guest} - your booking for ${when} is confirmed! Bring valid government-issued ID. Venue entry policies still apply.`,
        input.manageUrl,
      );
    case "booking_cancelled":
      return `Promotr: Your booking for ${when} has been cancelled. If this does not look right, reply here and our team will help.`;
    case "refund_started":
      return `Promotr: Your booking for ${when} is cancelled and your deposit refund has started. Your bank's processing time may vary.`;
  }
}
