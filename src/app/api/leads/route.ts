import { NextResponse, type NextRequest } from "next/server";
import { getServerEnvironment } from "@/lib/env/server";
import { sendBookingSmsNotification } from "@/lib/messaging/notifications";
import { getRateLimitKey } from "@/lib/security/request-key";
import { createAdminClient } from "@/lib/supabase/admin";
import { bookingInquirySchema } from "@/lib/validation/booking";

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Check the form and try again." },
      { status: 400 },
    );
  }
  const result = bookingInquirySchema.safeParse(body);
  if (!result.success)
    return NextResponse.json(
      {
        error: "Check the highlighted fields and try again.",
        fields: result.error.flatten().fieldErrors,
      },
      { status: 422 },
    );
  if (result.data.website) return NextResponse.json({ received: true });

  try {
    const environment = getServerEnvironment();
    const admin = createAdminClient();
    const { data, error } = await admin.rpc("submit_booking_inquiry", {
      p_idempotency_key: result.data.idempotencyKey,
      p_rate_limit_key: getRateLimitKey(
        request.headers,
        environment.LEAD_RATE_LIMIT_SECRET,
      ),
      p_payload: {
        name: result.data.name,
        email: result.data.email ?? null,
        phone: result.data.phone ?? null,
        instagram_handle: result.data.instagramHandle ?? null,
        requested_date: result.data.requestedDate,
        preferred_arrival_time: result.data.preferredArrivalTime || null,
        party_size: result.data.partySize,
        occasion: result.data.occasion ?? null,
        booking_type: result.data.bookingType,
        bottle_preference: result.data.bottlePreference ?? null,
        notes: result.data.notes ?? null,
        conversation_id: result.data.conversationId ?? null,
      },
    });
    if (error) {
      if (error.message.includes("rate_limit_exceeded"))
        return NextResponse.json(
          { error: "Too many attempts. Please try again later." },
          { status: 429 },
        );
      throw error;
    }
    if (result.data.conversationId) {
      const { error: linkError } = await admin
        .from("lead_conversations")
        .upsert(
          {
            lead_id: String(data),
            conversation_id: result.data.conversationId,
          },
          {
            onConflict: "lead_id,conversation_id",
            ignoreDuplicates: true,
          },
        );
      if (linkError)
        console.error("Unable to link booking inquiry to conversation", {
          code: linkError.code,
        });
    }
    if (result.data.bookingType !== "table")
      await sendBookingSmsNotification({
        leadId: String(data),
        eventType: "inquiry_received",
        eventKey: `lead:${data}:inquiry_received`,
      });
    return NextResponse.json({ received: true, leadId: data }, { status: 201 });
  } catch (error) {
    console.error("Lead submission failed", {
      name: error instanceof Error ? error.name : "UnknownError",
    });
    return NextResponse.json(
      {
        error:
          "We couldn't send your inquiry right now. Please wait a moment and try again.",
      },
      { status: 500 },
    );
  }
}
