import { NextResponse, type NextRequest } from "next/server";
import Stripe from "stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { createStripeClient, getStripeEnvironment } from "@/lib/stripe/server";

export async function POST(request: NextRequest) {
  const signature = request.headers.get("stripe-signature");
  if (!signature)
    return NextResponse.json({ error: "Missing signature." }, { status: 400 });
  let event: Stripe.Event;
  try {
    event = createStripeClient().webhooks.constructEvent(
      await request.text(),
      signature,
      getStripeEnvironment().STRIPE_WEBHOOK_SECRET,
    );
  } catch {
    return NextResponse.json({ error: "Invalid signature." }, { status: 400 });
  }
  const session = event.data.object as Stripe.Checkout.Session;
  const admin = createAdminClient();
  if (
    event.type === "checkout.session.completed" &&
    session.payment_status === "paid"
  ) {
    const paymentIntent =
      typeof session.payment_intent === "string"
        ? session.payment_intent
        : session.payment_intent?.id || "";
    const { error } = await admin.rpc("confirm_deposit_payment", {
      p_session_id: session.id,
      p_payment_intent_id: paymentIntent,
    });
    if (error)
      return NextResponse.json(
        { error: "Unable to record payment." },
        { status: 500 },
      );
  }
  if (event.type === "checkout.session.expired")
    await admin
      .from("table_bookings")
      .update({ status: "expired", updated_at: new Date().toISOString() })
      .eq("stripe_checkout_session_id", session.id)
      .eq("status", "held");
  return NextResponse.json({ received: true });
}
