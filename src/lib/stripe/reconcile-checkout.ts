import "server-only";

import type Stripe from "stripe";
import { createAdminClient } from "@/lib/supabase/admin";

export async function reconcilePaidCheckout(session: Stripe.Checkout.Session) {
  if (session.payment_status !== "paid") return false;
  const paymentIntent =
    typeof session.payment_intent === "string"
      ? session.payment_intent
      : session.payment_intent?.id || "";
  if (!paymentIntent) return false;
  const { error } = await createAdminClient().rpc("confirm_deposit_payment", {
    p_session_id: session.id,
    p_payment_intent_id: paymentIntent,
  });
  if (error) throw error;
  return true;
}
