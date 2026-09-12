import { NextResponse, type NextRequest } from "next/server";
import { validateTwilioRequest } from "@/lib/messaging/channels/twilio";
import { createAdminClient } from "@/lib/supabase/admin";

const acceptedStatuses = new Set([
  "queued",
  "sent",
  "delivered",
  "undelivered",
  "failed",
]);

export async function POST(request: NextRequest) {
  const form = await request.formData();
  const params = Object.fromEntries(
    [...form.entries()].map(([key, value]) => [key, String(value)]),
  );
  const signature = request.headers.get("x-twilio-signature") || "";
  if (!validateTwilioRequest(signature, request.url, params))
    return NextResponse.json({ error: "Invalid signature" }, { status: 403 });

  const sid = params.MessageSid || params.SmsSid;
  const status = params.MessageStatus || params.SmsStatus;
  if (!sid || !acceptedStatuses.has(status))
    return NextResponse.json({ received: true });
  const admin = createAdminClient();
  await Promise.all([
    admin
      .from("messages")
      .update({ delivery_status: status })
      .eq("provider_message_id", sid),
    admin
      .from("outbound_notifications")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("provider_message_id", sid),
  ]);
  return NextResponse.json({ received: true });
}
