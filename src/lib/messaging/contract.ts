export const smsEventTypes = [
  "inquiry_received",
  "deposit_received",
  "guest_updated",
  "admin_updated",
  "booking_confirmed",
  "booking_cancelled",
  "refund_started",
] as const;

export type SmsEventType = (typeof smsEventTypes)[number];

export type BookingSmsTemplateInput = {
  eventType: SmsEventType;
  guestName: string;
  bookingDate: string;
  arrivalTime?: string | null;
  depositCad?: number | null;
  manageUrl?: string | null;
};
