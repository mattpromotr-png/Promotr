"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/admin";
import { translateStaffReply } from "@/lib/ai/translate-staff-reply";
import { sendSmsConversationMessage } from "@/lib/messaging/sms-conversation";
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
  if (conversation.channel === "sms") {
    await sendSmsConversationMessage({ conversationId, content });
    revalidatePath("/admin/conversations");
    revalidatePath("/admin/leads");
    return;
  }
  if (conversation.channel !== "web_preview")
    throw new Error(
      "Instagram replies must be sent through Meta Business Suite until Meta messaging is connected.",
    );
  const { data: latestGuest } = await admin
    .from("messages")
    .select("metadata")
    .eq("conversation_id", conversationId)
    .eq("sender_type", "guest")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const metadata = latestGuest?.metadata as {
    detectedLanguage?: string;
  } | null;
  const targetLanguage = metadata?.detectedLanguage || "English";
  const deliveredContent = await translateStaffReply(content, targetLanguage);
  const { error } = await admin.from("messages").insert({
    conversation_id: conversationId,
    direction: "outbound",
    sender_type: "human",
    content: deliveredContent,
    delivery_status: "sent",
    metadata: {
      detectedLanguage: targetLanguage,
      englishTranslation:
        targetLanguage.toLowerCase() === "english" ? null : content,
      adminOriginalEnglish:
        targetLanguage.toLowerCase() === "english" ? null : content,
    },
  });
  if (error) throw new Error("Unable to send the message.");
  await admin
    .from("conversations")
    .update({
      last_message_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", conversationId);
  revalidatePath("/admin/conversations");
  revalidatePath("/admin/leads");
}

export async function pauseConversationAutomation(formData: FormData) {
  await requireAdmin();
  const conversationId = String(formData.get("conversationId") ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(conversationId)) return;
  const { error } = await createAdminClient()
    .from("conversations")
    .update({
      human_takeover: true,
      updated_at: new Date().toISOString(),
    })
    .eq("id", conversationId)
    .in("channel", ["web_preview", "sms"]);
  if (error) throw new Error("Unable to pause automatic replies.");
  revalidatePath("/admin/conversations");
  revalidatePath("/admin/leads");
}

export async function resumeConversationAutomation(formData: FormData) {
  await requireAdmin();
  const conversationId = String(formData.get("conversationId") ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(conversationId)) return;
  const { error } = await createAdminClient()
    .from("conversations")
    .update({
      human_takeover: false,
      updated_at: new Date().toISOString(),
    })
    .eq("id", conversationId)
    .in("channel", ["web_preview", "sms"]);
  if (error) throw new Error("Unable to resume automatic replies.");
  revalidatePath("/admin/conversations");
  revalidatePath("/admin/leads");
}
