import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createBookingManageToken } from "@/lib/bookings/manage-token";
import { createAdminClient } from "@/lib/supabase/admin";
import { createStripeClient, getStripeEnvironment } from "@/lib/stripe/server";

const requestSchema = z.object({
  leadId: z.string().uuid(),
  tableId: z.string().uuid(),
});

export async function POST(request: NextRequest) {
  const result = requestSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!result.success)
    return NextResponse.json(
      { error: "Invalid booking request." },
      { status: 400 },
    );
  const admin = createAdminClient();
  const { data: hold, error } = await admin.rpc("create_table_hold", {
    p_lead_id: result.data.leadId,
    p_table_id: result.data.tableId,
  });
  if (error) {
    const unavailable =
      error.message.includes("table_unavailable") ||
      error.message.includes("table_capacity_exceeded");
    return NextResponse.json(
      {
        error: unavailable
          ? "That table is no longer available for this date."
          : "Unable to hold this table.",
      },
      { status: unavailable ? 409 : 500 },
    );
  }
  try {
    const environment = getStripeEnvironment();
    const manageToken = createBookingManageToken(hold.bookingId);
    const session = await createStripeClient().checkout.sessions.create(
      {
        mode: "payment",
        success_url: `${environment.NEXT_PUBLIC_APP_URL}/book/payment/success?session_id={CHECKOUT_SESSION_ID}&booking=${hold.bookingId}&token=${manageToken}`,
        cancel_url: `${environment.NEXT_PUBLIC_APP_URL}/book/payment/cancelled`,
        expires_at: Math.floor(Date.now() / 1000) + 30 * 60,
        customer_creation: "always",
        line_items: [
          {
            quantity: 1,
            price_data: {
              currency: "cad",
              unit_amount: hold.depositCents,
              product_data: {
                name: `Promotr table deposit — ${hold.tableName}`,
                description: `Applied toward a CAD ${hold.minimumSpendCad} minimum spend.`,
              },
            },
          },
        ],
        metadata: {
          booking_id: hold.bookingId,
          lead_id: result.data.leadId,
          table_id: result.data.tableId,
        },
      },
      { idempotencyKey: `promotr-deposit-${hold.bookingId}` },
    );
    const { error: updateError } = await admin
      .from("table_bookings")
      .update({
        stripe_checkout_session_id: session.id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", hold.bookingId);
    if (updateError || !session.url)
      throw new Error("Unable to save checkout session");
    return NextResponse.json({ url: session.url });
  } catch {
    await admin
      .from("table_bookings")
      .update({ status: "cancelled", updated_at: new Date().toISOString() })
      .eq("id", hold.bookingId)
      .eq("status", "held");
    return NextResponse.json(
      { error: "Secure payment is not configured yet." },
      { status: 503 },
    );
  }
}
