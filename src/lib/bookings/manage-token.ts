import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";
import { getServerEnvironment } from "@/lib/env/server";

export function createBookingManageToken(bookingId: string) {
  return createHmac("sha256", getServerEnvironment().LEAD_RATE_LIMIT_SECRET)
    .update(`booking-manage:${bookingId}`)
    .digest("base64url");
}

export function createInquiryManageToken(leadId: string) {
  return createHmac("sha256", getServerEnvironment().LEAD_RATE_LIMIT_SECRET)
    .update(`inquiry-manage:${leadId}`)
    .digest("base64url");
}

export function isValidBookingManageToken(bookingId: string, token: string) {
  const expected = createBookingManageToken(bookingId);
  const actualBuffer = Buffer.from(token);
  const expectedBuffer = Buffer.from(expected);
  return (
    actualBuffer.length === expectedBuffer.length &&
    timingSafeEqual(actualBuffer, expectedBuffer)
  );
}

export function isValidInquiryManageToken(leadId: string, token: string) {
  const expected = createInquiryManageToken(leadId);
  const actualBuffer = Buffer.from(token);
  const expectedBuffer = Buffer.from(expected);
  return (
    actualBuffer.length === expectedBuffer.length &&
    timingSafeEqual(actualBuffer, expectedBuffer)
  );
}
