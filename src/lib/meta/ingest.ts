import "server-only";

import type { NormalizedInstagramEvent } from "@/lib/meta/webhook";
import { requiresStaffAttention } from "@/lib/messaging/policy";
import { notifyVenueManagers } from "@/lib/notifications/manager-push";
import { createAdminClient } from "@/lib/supabase/admin";

export async function ingestInstagramEvent(event: NormalizedInstagramEvent) {
  const configuredAccountId = process.env.META_INSTAGRAM_ACCOUNT_ID;
  if (!configuredAccountId || event.recipientId !== configuredAccountId)
    return { accepted: false, reason: "wrong_account" } as const;

  const admin = createAdminClient();
  const { data: venue, error: venueError } = await admin
    .from("venues")
    .select("id")
    .eq("slug", "promotr-nightclub")
    .single();
  if (venueError || !venue) throw new Error("Venue is unavailable.");

  const { data: contact, error: contactError } = await admin
    .from("contacts")
    .upsert(
      {
        venue_id: venue.id,
        instagram_scoped_id: event.senderId,
        last_seen_at: new Date().toISOString(),
      },
      { onConflict: "venue_id,instagram_scoped_id" },
    )
    .select("id")
    .single();
  if (contactError || !contact) throw new Error("Unable to save guest.");

  const { error: identityError } = await admin.from("contact_channels").upsert(
    {
      venue_id: venue.id,
      contact_id: contact.id,
      channel: "instagram",
      external_address: event.senderId,
      normalized_address: event.senderId,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "venue_id,channel,normalized_address" },
  );
  if (identityError) throw new Error("Unable to save Instagram identity.");

  const { data: conversation, error: conversationError } = await admin
    .from("conversations")
    .upsert(
      {
        venue_id: venue.id,
        contact_id: contact.id,
        channel: "instagram",
        last_message_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "venue_id,contact_id,channel" },
    )
    .select("id")
    .single();
  if (conversationError || !conversation)
    throw new Error("Unable to save Instagram conversation.");

  const { error: messageError } = await admin.from("messages").insert({
    conversation_id: conversation.id,
    provider_message_id: event.providerMessageId,
    direction: "inbound",
    sender_type: "guest",
    content: event.text,
    delivery_status: "received",
    metadata: { instagram: { senderId: event.senderId } },
  });
  if (messageError?.code === "23505")
    // A prior request may have persisted the message but lost its deferred AI task.
    // Re-claiming is safe: the database claim prevents a duplicate reply.
    return { accepted: true, conversationId: conversation.id, duplicate: true } as const;
  if (messageError) throw new Error("Unable to save Instagram message.");

  const needsStaff = requiresStaffAttention(event.text);
  if (needsStaff)
    await admin
      .from("conversations")
      .update({
        status: "handoff_required",
        handoff_reason: "Guest requested staff attention on Instagram.",
        updated_at: new Date().toISOString(),
      })
      .eq("id", conversation.id);
  try {
    await notifyVenueManagers({
      venueId: venue.id,
      conversationId: conversation.id,
      channel: "instagram",
      title: needsStaff ? "Guest needs staff help" : "New Instagram message",
      body: event.text,
      kind: needsStaff ? "follow_up" : "new_message",
    });
  } catch (error) {
    console.error("Unable to notify managers about Instagram message", error);
  }
  return {
    accepted: true,
    conversationId: conversation.id,
  } as const;
}
