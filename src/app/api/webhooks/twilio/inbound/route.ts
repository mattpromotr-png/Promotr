import { after, NextResponse, type NextRequest } from "next/server";
import {
  normalizeSmsPhone,
  validateTwilioRequest,
} from "@/lib/messaging/channels/twilio";
import {
  generateConciergeReply,
  smsConciergeText,
} from "@/lib/messaging/concierge";
import { requiresStaffAttention } from "@/lib/messaging/policy";
import { sendSmsConversationMessage } from "@/lib/messaging/sms-conversation";
import { notifyVenueManagers } from "@/lib/notifications/manager-push";
import { createAdminClient } from "@/lib/supabase/admin";

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
    .select("id,human_takeover,follow_up_enabled,follow_up_delay_minutes")
    .single();
  if (!conversation) return twiml();

  const { data: inboundMessage } = await admin
    .from("messages")
    .insert({
      conversation_id: conversation.id,
      provider_message_id: messageSid,
      direction: "inbound",
      sender_type: "guest",
      content,
      delivery_status: "received",
      metadata: { twilio: { from: params.From, to: params.To } },
    })
    .select("id")
    .single();

  if (conversation.follow_up_enabled) {
    await admin
      .from("conversations")
      .update({
        follow_up_attempts: 0,
        next_follow_up_at: new Date(
          Date.now() + conversation.follow_up_delay_minutes * 60_000,
        ).toISOString(),
      })
      .eq("id", conversation.id);
  }

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
    .select("id,phone,name")
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

  const needsStaff = requiresStaffAttention(content);
  after(async () => {
    try {
      await notifyVenueManagers({
        venueId: venue.id,
        conversationId: conversation.id,
        channel: "sms",
        title: needsStaff
          ? "Guest needs staff help"
          : `New SMS from ${lead?.name || phone}`,
        body: content,
        kind: needsStaff ? "follow_up" : "new_message",
      });
    } catch (error) {
      console.error("Unable to notify managers", error);
    }
  });

  if (needsStaff) {
    await admin
      .from("conversations")
      .update({
        status: "handoff_required",
        handoff_reason: "Guest requested staff attention by SMS.",
        updated_at: new Date().toISOString(),
      })
      .eq("id", conversation.id);
    if (!optOutType)
      after(async () => {
        try {
          await sendSmsConversationMessage({
            conversationId: conversation.id,
            content:
              "Promotr: Thanks for letting us know. I've sent this to our venue team for priority review, and a staff member can reply to you here.",
            senderType: "ai",
          });
        } catch (error) {
          console.error("Unable to send SMS handoff acknowledgement", error);
        }
      });
  } else if (!optOutType)
    after(async () => {
      try {
        await processSmsWithConcierge(conversation.id, inboundMessage?.id);
      } catch (error) {
        console.error("Unable to process inbound SMS", error);
      }
    });
  return twiml();
}

async function processSmsWithConcierge(
  conversationId: string,
  inboundMessageId?: string,
) {
  const admin = createAdminClient();
  const { data: conversation } = await admin
    .from("conversations")
    .select(
      "human_takeover,venue_id,contact_id,rolling_summary,contacts(display_name,preferred_language,memory)",
    )
    .eq("id", conversationId)
    .single();
  if (!conversation) return;
  const { data } = await admin
    .from("messages")
    .select("id,direction,content,metadata")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: false })
    .limit(8);
  const recent = [...(data || [])].reverse().map((message) => ({
    role:
      message.direction === "inbound"
        ? ("user" as const)
        : ("assistant" as const),
    content: message.content,
  }));
  if (!recent.length) return;
  const contact = Array.isArray(conversation.contacts)
    ? conversation.contacts[0]
    : conversation.contacts;
  const result = await generateConciergeReply(recent, {
    summary: conversation.rolling_summary,
    contactMemory: asRecord(contact?.memory),
    knownName: contact?.display_name,
    preferredLanguage: contact?.preferred_language,
  });
  const latestInbound = data?.find(
    (message) =>
      message.id === inboundMessageId || message.direction === "inbound",
  );
  if (latestInbound) {
    await admin
      .from("messages")
      .update({
        metadata: {
          ...asRecord(latestInbound.metadata),
          detectedLanguage: result.detectedLanguage,
          englishTranslation: result.latestGuestMessageEnglish,
        },
      })
      .eq("id", latestInbound.id);
  }
  const existingFacts = Array.isArray(asRecord(contact?.memory).facts)
    ? (asRecord(contact?.memory).facts as unknown[]).filter(
        (fact): fact is string => typeof fact === "string",
      )
    : [];
  const memoryFacts = [
    ...new Set([...existingFacts, ...result.memoryFacts]),
  ].slice(-20);
  await Promise.all([
    admin
      .from("contacts")
      .update({
        ...(result.guestFirstName && !contact?.display_name
          ? { display_name: result.guestFirstName }
          : {}),
        preferred_language:
          result.detectedLanguage === "Unknown"
            ? contact?.preferred_language
            : result.detectedLanguage,
        memory: {
          ...asRecord(contact?.memory),
          facts: memoryFacts,
          updatedAt: new Date().toISOString(),
        },
        memory_updated_at: new Date().toISOString(),
      })
      .eq("id", conversation.contact_id),
    admin
      .from("conversations")
      .update({
        rolling_summary: result.conversationSummary,
        updated_at: new Date().toISOString(),
      })
      .eq("id", conversationId),
  ]);
  const { data: latestMode } = await admin
    .from("conversations")
    .select("human_takeover")
    .eq("id", conversationId)
    .single();
  if (!latestMode || latestMode.human_takeover) return;
  await sendSmsConversationMessage({
    conversationId,
    content: smsConciergeText(result),
    senderType: "ai",
    metadata: {
      detectedLanguage: result.detectedLanguage,
      englishTranslation: result.replyEnglish,
    },
  });
  if (result.handoffRequired) {
    await admin
      .from("conversations")
      .update({
        status: "handoff_required",
        handoff_reason: result.handoffReason,
        updated_at: new Date().toISOString(),
      })
      .eq("id", conversationId);
    try {
      await notifyVenueManagers({
        venueId: conversation.venue_id,
        conversationId,
        channel: "sms",
        title: "Conversation needs review",
        body:
          result.handoffReason || "A guest conversation needs staff attention.",
        kind: "follow_up",
      });
    } catch (error) {
      console.error("Unable to notify managers about follow-up", error);
    }
  }
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
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
