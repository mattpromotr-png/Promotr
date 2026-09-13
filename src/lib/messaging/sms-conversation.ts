import "server-only";

import { sendTwilioSms } from "@/lib/messaging/channels/twilio";
import { createAdminClient } from "@/lib/supabase/admin";

export async function sendSmsConversationMessage(input: {
  conversationId: string;
  content: string;
  senderType?: "human" | "ai";
}) {
  const admin = createAdminClient();
  const { data: conversation, error: conversationError } = await admin
    .from("conversations")
    .select("id,contact_id,channel")
    .eq("id", input.conversationId)
    .single();
  if (conversationError || conversation?.channel !== "sms")
    throw new Error("SMS conversation not found.");
  const { data: identity, error: identityError } = await admin
    .from("contact_channels")
    .select("normalized_address")
    .eq("contact_id", conversation.contact_id)
    .eq("channel", "sms")
    .single();
  if (identityError || !identity) throw new Error("SMS destination not found.");
  const { data: consent } = await admin
    .from("sms_consents")
    .select("status")
    .eq("phone_e164", identity.normalized_address)
    .maybeSingle();
  if (consent?.status === "opted_out")
    throw new Error("This guest opted out of SMS messages.");

  const { data: message, error: messageError } = await admin
    .from("messages")
    .insert({
      conversation_id: conversation.id,
      direction: "outbound",
      sender_type: input.senderType || "human",
      content: input.content,
      delivery_status: "pending",
      metadata: {
        sentFromAdmin: (input.senderType || "human") === "human",
      },
    })
    .select("id")
    .single();
  if (messageError || !message) throw new Error("Unable to store SMS reply.");
  try {
    const result = await sendTwilioSms({
      to: identity.normalized_address,
      body: input.content,
    });
    if (!result.configured) throw new Error("Twilio is not configured.");
    await Promise.all([
      admin
        .from("messages")
        .update({
          provider_message_id: result.sid,
          delivery_status: result.status || "queued",
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
    return result.sid;
  } catch (error) {
    await admin
      .from("messages")
      .update({ delivery_status: "failed" })
      .eq("id", message.id);
    throw error;
  }
}
