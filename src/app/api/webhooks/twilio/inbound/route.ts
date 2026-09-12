import { NextResponse, type NextRequest } from "next/server";
import {
  normalizeSmsPhone,
  validateTwilioRequest,
} from "@/lib/messaging/channels/twilio";
import { createAdminClient } from "@/lib/supabase/admin";

const handoffPattern =
  /\b(human|person|staff|manager|admin|complaint|refund|charged|security)\b/i;

export async function POST(request: NextRequest) {
  const form = await request.formData();
  const params = Object.fromEntries(
    [...form.entries()].map(([key, value]) => [key, String(value)]),
  );
  const signature = request.headers.get("x-twilio-signature") || "";
  if (!validateTwilioRequest(signature, request.url, params))
    return NextResponse.json({ error: "Invalid signature" }, { status: 403 });

  const phone = normalizeSmsPhone(params.From || "");
  const messageSid = params.MessageSid;
  const content = (params.Body || "").trim().slice(0, 4000);
  if (!phone || !messageSid || !content) return twiml();

  const admin = createAdminClient();
  const { data: duplicate } = await admin
    .from("messages")
    .select("id")
    .eq("provider_message_id", messageSid)
    .maybeSingle();
  if (duplicate) return twiml();

  const { data: venue } = await admin
    .from("venues")
    .select("id")
    .eq("slug", "promotr-nightclub")
    .single();
  if (!venue) return twiml();

  let { data: identity } = await admin
    .from("contact_channels")
    .select("id,contact_id")
    .eq("venue_id", venue.id)
    .eq("channel", "sms")
    .eq("normalized_address", phone)
    .maybeSingle();
  if (!identity) {
    const { data: contact } = await admin
      .from("contacts")
      .upsert(
        {
          venue_id: venue.id,
          instagram_scoped_id: `sms:${phone}`,
          last_seen_at: new Date().toISOString(),
        },
        { onConflict: "venue_id,instagram_scoped_id" },
      )
      .select("id")
      .single();
    if (!contact) return twiml();
    const created = await admin
      .from("contact_channels")
      .upsert(
        {
          venue_id: venue.id,
          contact_id: contact.id,
          channel: "sms",
          external_address: params.From,
          normalized_address: phone,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "venue_id,channel,normalized_address" },
      )
      .select("id,contact_id")
      .single();
    identity = created.data;
  }
  if (!identity) return twiml();

  const { data: conversation } = await admin
    .from("conversations")
    .upsert(
      {
        venue_id: venue.id,
        contact_id: identity.contact_id,
        channel: "sms",
        last_message_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "venue_id,contact_id,channel" },
    )
    .select("id")
    .single();
  if (!conversation) return twiml();

  await admin.from("messages").insert({
    conversation_id: conversation.id,
    provider_message_id: messageSid,
    direction: "inbound",
    sender_type: "guest",
    content,
    delivery_status: "received",
    metadata: { twilio: { from: params.From, to: params.To } },
  });

  const optOutType = params.OptOutType?.toUpperCase();
  if (optOutType === "STOP" || optOutType === "START")
    await admin.from("sms_consents").upsert(
      {
        contact_channel_id: identity.id,
        phone_e164: phone,
        status: optOutType === "STOP" ? "opted_out" : "opted_in",
        source: "incoming_sms",
        consented_at: optOutType === "START" ? new Date().toISOString() : null,
        opted_out_at: optOutType === "STOP" ? new Date().toISOString() : null,
        evidence: { optOutType, messageSid },
        updated_at: new Date().toISOString(),
      },
      { onConflict: "phone_e164" },
    );

  const { data: leads } = await admin
    .from("leads")
    .select("id,phone")
    .eq("venue_id", venue.id)
    .not("phone", "is", null)
    .order("updated_at", { ascending: false })
    .limit(200);
  const lead = leads?.find(
    (item) => item.phone && normalizeSmsPhone(item.phone) === phone,
  );
  if (lead)
    await admin
      .from("lead_conversations")
      .upsert(
        { lead_id: lead.id, conversation_id: conversation.id },
        { onConflict: "lead_id,conversation_id", ignoreDuplicates: true },
      );

  if (handoffPattern.test(content))
    await admin
      .from("conversations")
      .update({
        status: "handoff_required",
        human_takeover: true,
        handoff_reason: "Guest requested staff attention by SMS.",
        updated_at: new Date().toISOString(),
      })
      .eq("id", conversation.id);
  return twiml();
}

function twiml() {
  return new NextResponse(
    '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
    {
      status: 200,
      headers: { "Content-Type": "text/xml; charset=utf-8" },
    },
  );
}
