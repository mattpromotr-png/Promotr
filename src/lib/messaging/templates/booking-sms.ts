import type { BookingSmsTemplateInput } from "@/lib/messaging/contract";

function firstName(name: string) {
  return name.trim().split(/\s+/)[0] || "Guest";
}

function details(input: BookingSmsTemplateInput) {
  const time = input.arrivalTime ? ` at ${input.arrivalTime.slice(0, 5)}` : "";
  return `${input.bookingDate}${time}`;
}

function withLink(message: string, manageUrl?: string | null) {
  return manageUrl ? `${message} Manage: ${manageUrl}` : message;
}

export function renderBookingSms(input: BookingSmsTemplateInput) {
  const guest = firstName(input.guestName);
  const when = details(input);
  switch (input.eventType) {
    case "inquiry_received":
      return withLink(
        `Promotr: Hi ${guest}, we received your inquiry for ${when}. It is not confirmed yet; our team will review availability. Reply STOP to opt out.`,
        input.manageUrl,
      );
    case "deposit_received":
      return withLink(
        `Promotr: Hi ${guest}, your $${Number(input.depositCad || 0).toFixed(2)} CAD deposit was received for ${when}. Our team is processing your booking. Reply STOP to opt out.`,
        input.manageUrl,
      );
    case "guest_updated":
      return withLink(
        `Promotr: Your booking details for ${when} were updated. Our team will recheck availability and contact you if needed.`,
        input.manageUrl,
      );
    case "admin_updated":
      return withLink(
        `Promotr: Our team updated your booking details for ${when}. Please review the latest information.`,
        input.manageUrl,
      );
    case "booking_confirmed":
      return withLink(
        `Promotr: Your booking for ${when} is confirmed. Bring valid government-issued ID. Entry remains subject to venue policies.`,
        input.manageUrl,
      );
    case "booking_cancelled":
      return `Promotr: Your booking for ${when} was cancelled. Contact the venue if you believe this is incorrect.`;
    case "refund_started":
      return `Promotr: Your booking for ${when} was cancelled and your deposit refund was started. Bank processing times may vary.`;
  }
}
