import "server-only";

import { generateConciergeReply } from "@/lib/messaging/concierge";
import {
  conversationNeedsLostFoundForm,
  latestMessageNeedsLostFoundForm,
} from "@/lib/messaging/policy";
import { sendInstagramConversationMessage } from "@/lib/messaging/instagram-conversation";
import { loadRecallExcerpts } from "@/lib/messaging/recall";
import { notifyVenueManagers } from "@/lib/notifications/manager-push";
import { createAdminClient } from "@/lib/supabase/admin";

type Claim = {
  claimed?: boolean;
  reason?: string;
  messageId?: string;
  createdAt?: string;
};

export async function processInstagramConversation(conversationId: string) {
  await wait(3000);
  const admin = createAdminClient();
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const { data, error } = await admin.rpc("claim_instagram_concierge_work", {
      p_conversation_id: conversationId,
      p_quiet_seconds: 3,
    });
    if (error) {
      console.error("Unable to claim Instagram concierge work", {
        code: error.code,
      });
      return;
    }
    const claim = (data || {}) as Claim;
    if (claim.claimed && claim.messageId && claim.createdAt) {
      const outcome = await processClaimedBatch(conversationId, {
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

async function processClaimedBatch(
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
    if (!conversation || conversation.human_takeover) return outcome;

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
    if (!trailingInbound.length) return outcome;

    const batchText = trailingInbound.map((item) => item.content).join("\n");
    const recent = [
      ...ordered.slice(0, -trailingInbound.length).map((message) => ({
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
    const recallExcerpts = await loadRecallExcerpts(
      admin,
      conversation.venue_id,
      conversation.contact_id,
      batchText,
    );
    const foundItems = latestMessageNeedsLostFoundForm(batchText)
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
      availableFoundItems: (foundItems ?? []).map((item) => ({
        itemName: item.item_name,
        description: item.description,
        foundDate: item.found_date,
        foundLocation: item.found_location,
        tableNumber: item.table_number,
      })),
    });

    const latestInbound = trailingInbound.at(-1)!;
    await Promise.all([
      ...trailingInbound.slice(0, -1).map((message) =>
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
    const { data: staffReply } = await admin
      .from("messages")
      .select("id")
      .eq("conversation_id", conversationId)
      .eq("direction", "outbound")
      .eq("sender_type", "human")
      .gt("created_at", claim.createdAt)
      .limit(1)
      .maybeSingle();
    if (!latestMode || latestMode.human_takeover) return outcome;
    if (latestInboundNow?.id !== claim.messageId) {
      outcome = "retry";
      return outcome;
    }
    if (staffReply) {
      // Staff answered this turn; future guest messages still run through Vera.
      processed = true;
      return "processed";
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL;
    if (!appUrl) throw new Error("Public app URL is unavailable.");
    const reply = result.reply.replace(/https?:\/\/\S+/gi, "").trim();
    const links: string[] = [];
    if (result.shareBookingForm) {
      const url = new URL("/book", appUrl);
      url.searchParams.set("conversation", conversationId);
      links.push(`Booking inquiry: ${url.toString()}`);
    }
    if (conversationNeedsLostFoundForm(recent)) {
      const url = new URL("/lost-found", appUrl);
      url.searchParams.set("conversation", conversationId);
      links.push(`Lost-item report: ${url.toString()}`);
    }
    await sendInstagramConversationMessage({
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
          channel: "instagram",
          title: "Conversation needs review",
          body: result.handoffReason || "A guest needs staff attention.",
          kind: "follow_up",
        });
      } catch (error) {
        console.error(
          "Unable to notify managers about Instagram follow-up",
          error,
        );
      }
    }
    return outcome;
  } finally {
    await admin.rpc("finish_instagram_concierge_work", {
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
