import "server-only";

import type Stripe from "stripe";
import { sendBookingManagementEmail } from "@/lib/email/resend";
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
  const bookingId = session.metadata?.booking_id;
  if (bookingId) {
    const admin = createAdminClient();
    const { data: booking } = await admin
      .from("table_bookings")
      .select(
        "id,booking_date,management_email_sent_at,club_tables(name),leads(name,email)",
      )
      .eq("id", bookingId)
      .maybeSingle();
    const lead = booking?.leads as unknown as {
      name: string;
      email: string | null;
    } | null;
    const table = booking?.club_tables as unknown as { name: string } | null;
    if (booking && !booking.management_email_sent_at && lead?.email) {
      try {
        const sent = await sendBookingManagementEmail({
          bookingId,
          email: lead.email,
          guestName: lead.name,
          bookingDate: booking.booking_date,
          tableName: table?.name || "your table",
        });
        if (sent.sent)
          await admin
            .from("table_bookings")
            .update({ management_email_sent_at: new Date().toISOString() })
            .eq("id", bookingId);
      } catch (emailError) {
        console.error("Booking email failed", {
          name: emailError instanceof Error ? emailError.name : "UnknownError",
        });
      }
    }
  }
  return true;
}
