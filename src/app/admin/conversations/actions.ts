"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/admin";
import { createAdminClient } from "@/lib/supabase/admin";

export async function sendConversationReply(formData: FormData) {
  await requireAdmin();
  const conversationId = String(formData.get("conversationId") ?? "");
  const content = String(formData.get("content") ?? "").trim();
  if (
    !/^[0-9a-f-]{36}$/i.test(conversationId) ||
    !content ||
    content.length > 1000
  )
    return;
  const admin = createAdminClient();
  const { data: conversation, error: loadError } = await admin
    .from("conversations")
    .select("channel")
    .eq("id", conversationId)
    .single();
  if (loadError || !conversation)
    throw new Error("Unable to load this conversation.");
  if (conversation.channel !== "web_preview")
    throw new Error(
      "Instagram replies must be sent through Meta Business Suite until Meta messaging is connected.",
    );
  const { error } = await admin.from("messages").insert({
    conversation_id: conversationId,
    direction: "outbound",
    sender_type: "human",
    content,
    delivery_status: "sent",
  });
  if (error) throw new Error("Unable to send the message.");
  await admin
    .from("conversations")
    .update({
      human_takeover: true,
      status: "open",
      handoff_reason: null,
      last_message_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", conversationId);
  revalidatePath("/admin/conversations");
  revalidatePath("/admin/leads");
}

export async function returnConversationToAi(formData: FormData) {
  await requireAdmin();
  const conversationId = String(formData.get("conversationId") ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(conversationId)) return;
  const { error } = await createAdminClient()
    .from("conversations")
    .update({
      human_takeover: false,
      status: "open",
      handoff_reason: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", conversationId)
    .eq("channel", "web_preview");
  if (error) throw new Error("Unable to return this conversation to AI.");
  revalidatePath("/admin/conversations");
}
