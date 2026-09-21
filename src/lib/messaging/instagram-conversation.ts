import "server-only";

import { sendInstagramMessage } from "@/lib/messaging/channels/instagram";
import { createAdminClient } from "@/lib/supabase/admin";

export async function sendInstagramConversationMessage(input: {
  conversationId: string;
  content: string;
  senderType?: "human" | "ai";
  metadata?: Record<string, unknown>;
}) {
  const admin = createAdminClient();
  const { data: conversation } = await admin
    .from("conversations")
    .select("id,contact_id,channel")
    .eq("id", input.conversationId)
    .single();
  if (conversation?.channel !== "instagram")
    throw new Error("Instagram conversation not found.");
  const { data: contact } = await admin
    .from("contacts")
    .select("instagram_scoped_id")
    .eq("id", conversation.contact_id)
    .single();
  if (!contact?.instagram_scoped_id)
    throw new Error("Instagram recipient not found.");
  const { data: message, error: insertError } = await admin
    .from("messages")
    .insert({
      conversation_id: conversation.id,
      direction: "outbound",
      sender_type: input.senderType || "human",
      content: input.content,
      delivery_status: "pending",
      metadata: {
        ...input.metadata,
        sentFromAdmin: (input.senderType || "human") === "human",
      },
    })
    .select("id")
    .single();
  if (insertError || !message)
    throw new Error("Unable to store Instagram reply.");
  try {
    const sent = await sendInstagramMessage({
      recipientId: contact.instagram_scoped_id,
      text: input.content,
    });
    await Promise.all([
      admin
        .from("messages")
        .update({
          provider_message_id: sent.messageId,
          delivery_status: "sent",
        })
        .eq("id", message.id),
      admin
        .from("conversations")
        .update({
          last_message_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", conversation.id),
    ]);
    return sent.messageId;
  } catch (error) {
    await admin
      .from("messages")
      .update({ delivery_status: "failed" })
      .eq("id", message.id);
    throw error;
  }
}
