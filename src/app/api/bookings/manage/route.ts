import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { isValidBookingManageToken } from "@/lib/bookings/manage-token";
import { createStripeClient } from "@/lib/stripe/server";
import { createAdminClient } from "@/lib/supabase/admin";

const baseSchema = z.object({
  bookingId: z.string().uuid(),
  token: z.string().min(32).max(100),
});
const requestSchema = z.discriminatedUnion("action", [
  baseSchema.extend({
    action: z.literal("update"),
    name: z.string().trim().min(2).max(100),
    email: z.union([z.string().trim().email(), z.literal("")]),
    phone: z.string().trim().max(30),
    partySize: z.coerce.number().int().min(1).max(100),
    preferredArrivalTime: z.string().max(10),
    occasion: z.string().trim().max(100),
    notes: z.string().trim().max(1000),
  }),
  baseSchema.extend({ action: z.literal("cancel") }),
]);

export async function POST(request: NextRequest) {
  const result = requestSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!result.success)
    return NextResponse.json(
      { error: "Check the booking details and try again." },
      { status: 400 },
    );
  const input = result.data;
  if (!isValidBookingManageToken(input.bookingId, input.token))
    return NextResponse.json(
      { error: "This private booking link is invalid." },
      { status: 403 },
    );

  const admin = createAdminClient();
  const { data: booking, error } = await admin
    .from("table_bookings")
    .select("id,lead_id,table_id,booking_date,status,stripe_payment_intent_id")
    .eq("id", input.bookingId)
    .maybeSingle();
  if (error || !booking)
    return NextResponse.json({ error: "Booking not found." }, { status: 404 });

  if (input.action === "update") {
    if (["cancelled", "refunded", "expired"].includes(booking.status))
      return NextResponse.json(
        { error: "This booking can no longer be changed." },
        { status: 409 },
      );
    if (!input.email && !input.phone)
      return NextResponse.json(
        { error: "Enter an email address or phone number." },
        { status: 400 },
      );
    const { data: table } = await admin
      .from("club_tables")
      .select("capacity")
      .eq("id", booking.table_id)
      .single();
    if (!table || input.partySize > table.capacity)
      return NextResponse.json(
        {
          error: `This table accommodates up to ${table?.capacity ?? 0} guests.`,
        },
        { status: 409 },
      );
    const { error: updateError } = await admin
      .from("leads")
      .update({
        name: input.name,
        email: input.email || null,
        phone: input.phone || null,
        party_size: input.partySize,
        preferred_arrival_time: input.preferredArrivalTime || null,
        occasion: input.occasion || null,
        notes: input.notes || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", booking.lead_id);
    if (updateError)
      return NextResponse.json(
        { error: "Unable to update this booking." },
        { status: 500 },
      );
    return NextResponse.json({ message: "Your booking details were updated." });
  }

  if (["cancelled", "refunded"].includes(booking.status))
    return NextResponse.json({ message: "This booking is already cancelled." });
  const eventTime = new Date(
    `${booking.booking_date}T22:00:00-04:00`,
  ).getTime();
  const refundable = eventTime - Date.now() >= 48 * 60 * 60 * 1000;
  let refundId: string | null = null;
  if (
    booking.status === "confirmed" &&
    refundable &&
    booking.stripe_payment_intent_id
  ) {
    try {
      const refund = await createStripeClient().refunds.create(
        {
          payment_intent: booking.stripe_payment_intent_id,
          reason: "requested_by_customer",
        },
        { idempotencyKey: `promotr-cancel-${booking.id}` },
      );
      refundId = refund.id;
    } catch {
      return NextResponse.json(
        { error: "The refund could not be started. Please contact the venue." },
        { status: 502 },
      );
    }
  }
  const now = new Date().toISOString();
  const status = refundId ? "refunded" : "cancelled";
  const { error: cancelError } = await admin
    .from("table_bookings")
    .update({
      status,
      cancelled_at: now,
      refunded_at: refundId ? now : null,
      stripe_refund_id: refundId,
      cancellation_reason: "guest_self_service",
      updated_at: now,
    })
    .eq("id", booking.id);
  if (cancelError)
    return NextResponse.json(
      { error: "Unable to cancel this booking." },
      { status: 500 },
    );
  return NextResponse.json({
    message: refundId
      ? "Your booking was cancelled and the deposit refund was started."
      : "Your booking was cancelled. Under the demo policy, deposits are non-refundable within 48 hours.",
  });
}
