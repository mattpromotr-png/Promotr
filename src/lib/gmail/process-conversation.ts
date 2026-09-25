import "server-only";

import { generateConciergeReply } from "@/lib/messaging/concierge";
import { sendEmailConversationMessage } from "@/lib/messaging/email-conversation";
import {
  conversationNeedsLostFoundForm,
  latestMessageNeedsLostFoundForm,
} from "@/lib/messaging/policy";
import { loadRecallExcerpts } from "@/lib/messaging/recall";
import { notifyVenueManagers } from "@/lib/notifications/manager-push";
import { createAdminClient } from "@/lib/supabase/admin";
import { readActiveVenueKnowledge } from "@/lib/venue/knowledge";
import { readPublishedVenueInformation } from "@/lib/venue/published-information";

type Claim = {
  claimed?: boolean;
  reason?: string;
  messageId?: string;
  createdAt?: string;
};

export async function processEmailConversation(conversationId: string) {
  const admin = createAdminClient();
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const { data, error } = await admin.rpc("claim_email_concierge_work", {
      p_conversation_id: conversationId,
      p_quiet_seconds: 0,
    });
    if (error) {
      console.error("Unable to claim email concierge work", {
        code: error.code,
      });
      return;
    }
    const claim = (data || {}) as Claim;
    if (claim.claimed && claim.messageId && claim.createdAt) {
      await processClaimedEmail(conversationId, {
        messageId: claim.messageId,
        createdAt: claim.createdAt,
      });
      return;
    }
    if (claim.reason !== "busy") return;
    await wait(500);
  }
}

async function processClaimedEmail(
  conversationId: string,
  claim: { messageId: string; createdAt: string },
) {
  const admin = createAdminClient();
  let processed = false;
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
    const latestInbound = ordered.at(-1);
    if (!latestInbound || latestInbound.direction !== "inbound") return;
    const recent = ordered.slice(-8).map((message) => ({
      role:
        message.direction === "inbound"
          ? ("user" as const)
          : ("assistant" as const),
      content: message.content,
    }));
    const contact = Array.isArray(conversation.contacts)
      ? conversation.contacts[0]
      : conversation.contacts;
    const [recallExcerpts, venueResult] = await Promise.all([
      loadRecallExcerpts(
        admin,
        conversation.venue_id,
        conversation.contact_id,
        latestInbound.content,
      ),
      admin
        .from("venues")
        .select("venue_facts")
        .eq("id", conversation.venue_id)
        .maybeSingle(),
    ]);
    const foundItems = latestMessageNeedsLostFoundForm(latestInbound.content)
      ? (
          await admin
            .from("found_items")
            .select(
              "item_name,description,found_date,found_location,table_number",
            )
            .eq("venue_id", conversation.venue_id)
            .eq("status", "available")
            .order("found_date", { ascending: false })
            .limit(20)
        ).data
      : [];
    const result = await generateConciergeReply(recent, {
      summary: conversation.rolling_summary,
      contactMemory: asRecord(contact?.memory),
      knownName: contact?.display_name,
      preferredLanguage: contact?.preferred_language,
      recallExcerpts,
      availableFoundItems: (foundItems || []).map((item) => ({
        itemName: item.item_name,
        description: item.description,
        foundDate: item.found_date,
        foundLocation: item.found_location,
        tableNumber: item.table_number,
      })),
      venueInformation: readPublishedVenueInformation(
        venueResult.data?.venue_facts,
      ),
      venueKnowledge: readActiveVenueKnowledge(venueResult.data?.venue_facts),
    });

    const existingFacts = Array.isArray(asRecord(contact?.memory).facts)
      ? (asRecord(contact?.memory).facts as unknown[]).filter(
          (fact): fact is string => typeof fact === "string",
        )
      : [];
    await Promise.all([
      admin
        .from("messages")
        .update({
          metadata: {
            ...asRecord(latestInbound.metadata),
            detectedLanguage: result.detectedLanguage,
            englishTranslation: result.latestGuestMessageEnglish,
          },
        })
        .eq("id", latestInbound.id),
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
            facts: [
              ...new Set([...existingFacts, ...result.memoryFacts]),
            ].slice(-20),
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
    const { data: newestInbound } = await admin
      .from("messages")
      .select("id")
      .eq("conversation_id", conversationId)
      .eq("direction", "inbound")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!latestMode || latestMode.human_takeover) return;
    if (newestInbound?.id !== claim.messageId) return;

    const reply = result.reply.replace(/https?:\/\/\S+/gi, "").trim();
    const links: string[] = [];
    if (result.shareBookingForm)
      links.push(
        `Booking inquiry: ${process.env.NEXT_PUBLIC_APP_URL}/book?conversation=${conversationId}`,
      );
    if (conversationNeedsLostFoundForm(recent))
      links.push(
        `Lost-item report: ${process.env.NEXT_PUBLIC_APP_URL}/lost-found?conversation=${conversationId}`,
      );
    await sendEmailConversationMessage({
      conversationId,
      content: [reply, ...links].join("\n\n"),
      senderType: "ai",
      metadata: {
        detectedLanguage: result.detectedLanguage,
        englishTranslation: result.replyEnglish,
        replyThroughInboundMessageId: claim.messageId,
      },
    });
    processed = true;
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
          channel: "email",
          title: "Email needs review",
          body: result.handoffReason || "A guest email needs staff attention.",
          kind: "follow_up",
        });
      } catch (error) {
        console.error("Unable to notify managers about email follow-up", error);
      }
    }
  } finally {
    await admin.rpc("finish_email_concierge_work", {
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
