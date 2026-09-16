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

export const maxDuration = 60;

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

  const { error: inboundError } = await admin.from("messages").insert({
    conversation_id: conversation.id,
    provider_message_id: messageSid,
    direction: "inbound",
    sender_type: "guest",
    content,
    delivery_status: "received",
    metadata: { twilio: { from: params.From, to: params.To } },
  });
  if (inboundError) {
    console.error("Unable to store inbound SMS", { code: inboundError.code });
    return twiml();
  }

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
  }
  if (!optOutType)
    after(async () => {
      try {
        await processQueuedSmsWithConcierge(conversation.id);
      } catch (error) {
        console.error("Unable to process inbound SMS", error);
      }
    });
  return twiml();
}

type ConciergeClaim = {
  claimed?: boolean;
  reason?: string;
  messageId?: string;
  createdAt?: string;
};

async function processQueuedSmsWithConcierge(conversationId: string) {
  await wait(3000);
  const admin = createAdminClient();
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const { data, error } = await admin.rpc("claim_sms_concierge_work", {
      p_conversation_id: conversationId,
      p_quiet_seconds: 3,
    });
    if (error) {
      console.error("Unable to claim SMS concierge work", {
        code: error.code,
      });
      return;
    }
    const claim = (data || {}) as ConciergeClaim;
    if (claim.claimed && claim.messageId && claim.createdAt) {
      const outcome = await processClaimedSmsBatch(conversationId, {
        messageId: claim.messageId,
        createdAt: claim.createdAt,
      });
      if (outcome !== "retry") return;
      await wait(3000);
      continue;
    }
    if (!["busy", "not_quiet"].includes(claim.reason || "")) return;
    await wait(1800);
  }
}

async function processClaimedSmsBatch(
  conversationId: string,
  claim: { messageId: string; createdAt: string },
) {
  const admin = createAdminClient();
  let processed = false;
  let outcome: "processed" | "retry" | "stop" = "stop";
  try {
    const { data: conversation } = await admin
      .from("conversations")
      .select(
        "human_takeover,venue_id,contact_id,rolling_summary,contacts(display_name,preferred_language,memory)",
      )
      .eq("id", conversationId)
      .single();
    if (!conversation || conversation.human_takeover) return;
    const { data } = await admin
      .from("messages")
      .select("id,direction,content,metadata,created_at")
      .eq("conversation_id", conversationId)
      .lte("created_at", claim.createdAt)
      .order("created_at", { ascending: false })
      .limit(12);
    const ordered = [...(data || [])].reverse();
    const trailingInbound = [] as typeof ordered;
    for (let index = ordered.length - 1; index >= 0; index -= 1) {
      if (ordered[index]?.direction !== "inbound") break;
      trailingInbound.unshift(ordered[index]!);
    }
    if (!trailingInbound.length) return;
    const batchStart = ordered.length - trailingInbound.length;
    const batchText = trailingInbound
      .map((message) => message.content)
      .join("\n");
    const recent = [
      ...ordered.slice(0, batchStart).map((message) => ({
        role:
          message.direction === "inbound"
            ? ("user" as const)
            : ("assistant" as const),
        content: message.content,
      })),
      { role: "user" as const, content: batchText },
    ].slice(-8);
    const contact = Array.isArray(conversation.contacts)
      ? conversation.contacts[0]
      : conversation.contacts;
    const result = await generateConciergeReply(recent, {
      summary: conversation.rolling_summary,
      contactMemory: asRecord(contact?.memory),
      knownName: contact?.display_name,
      preferredLanguage: contact?.preferred_language,
    });
    const grouped = trailingInbound.slice(0, -1);
    const latestInbound = trailingInbound.at(-1)!;
    await Promise.all([
      ...grouped.map((message) =>
        admin
          .from("messages")
          .update({
            metadata: {
              ...asRecord(message.metadata),
              adminGroupedInto: latestInbound.id,
            },
          })
          .eq("id", message.id),
      ),
      admin
        .from("messages")
        .update({
          metadata: {
            ...asRecord(latestInbound.metadata),
            detectedLanguage: result.detectedLanguage,
            englishTranslation: result.latestGuestMessageEnglish,
            groupedGuestMessageCount: trailingInbound.length,
          },
        })
        .eq("id", latestInbound.id),
    ]);
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
    const { data: latestInboundNow } = await admin
      .from("messages")
      .select("id")
      .eq("conversation_id", conversationId)
      .eq("direction", "inbound")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!latestMode || latestMode.human_takeover) return outcome;
    if (latestInboundNow?.id !== claim.messageId) {
      outcome = "retry";
      return outcome;
    }
    await sendSmsConversationMessage({
      conversationId,
      content: smsConciergeText(result),
      senderType: "ai",
      metadata: {
        detectedLanguage: result.detectedLanguage,
        englishTranslation: result.replyEnglish,
        replyThroughInboundMessageId: claim.messageId,
      },
    });
    processed = true;
    outcome = "processed";
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
            result.handoffReason ||
            "A guest conversation needs staff attention.",
          kind: "follow_up",
        });
      } catch (error) {
        console.error("Unable to notify managers about follow-up", error);
      }
    }
    return outcome;
  } finally {
    await admin.rpc("finish_sms_concierge_work", {
      p_conversation_id: conversationId,
      p_message_id: claim.messageId,
      p_processed: processed,
    });
  }
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function wait(milliseconds: number) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
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
