"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/admin";
import { translateStaffReply } from "@/lib/ai/translate-staff-reply";
import { normalizeLanguageName } from "@/lib/ai/language";
import { sendSmsConversationMessage } from "@/lib/messaging/sms-conversation";
import { sendInstagramConversationMessage } from "@/lib/messaging/instagram-conversation";
import { createAdminClient } from "@/lib/supabase/admin";

export type StaffReplyState = {
  status: "idle" | "success" | "error";
  message: string;
  token: number;
};

export async function sendConversationReply(formData: FormData) {
  await requireAdmin();
  const conversationId = String(formData.get("conversationId") ?? "");
  const content = String(formData.get("content") ?? "").trim();
  if (
    !/^[0-9a-f-]{36}$/i.test(conversationId) ||
    !content ||
    content.length > 1000
  )
    throw new Error("Invalid reply details.");
  const admin = createAdminClient();
  const { data: conversation, error: loadError } = await admin
    .from("conversations")
    .select("channel,contact_id")
    .eq("id", conversationId)
    .single();
  if (loadError || !conversation)
    throw new Error("Unable to load this conversation.");
  if (conversation.channel === "sms" || conversation.channel === "instagram") {
    const { data: contact } = await admin
      .from("contacts")
      .select("preferred_language")
      .eq("id", conversation.contact_id)
      .maybeSingle();
    const targetLanguage = normalizeLanguageName(contact?.preferred_language);
    const deliveredContent = await translateStaffReply(content, targetLanguage);
    const sendMessage =
      conversation.channel === "sms"
        ? sendSmsConversationMessage
        : sendInstagramConversationMessage;
    await sendMessage({
      conversationId,
      content: deliveredContent,
      metadata: {
        detectedLanguage: targetLanguage,
        englishTranslation: content,
        adminOriginalEnglish:
          targetLanguage.toLowerCase() === "english" ? null : content,
      },
    });
    revalidatePath("/admin/conversations");
    revalidatePath("/admin/leads");
    return;
  }
  if (conversation.channel !== "web_preview")
    throw new Error("Unsupported conversation channel.");
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

export async function sendConversationReplyWithState(
  _previous: StaffReplyState,
  formData: FormData,
): Promise<StaffReplyState> {
  try {
    await sendConversationReply(formData);
    return {
      status: "success" as const,
      message: "Message sent.",
      token: Date.now(),
    };
  } catch (error) {
    console.error("Staff conversation reply failed", {
      reason: error instanceof Error ? error.message : "unknown_error",
    });
    const translationFailure =
      error instanceof Error &&
      /translation|OPENAI_API_KEY/i.test(error.message);
    return {
      status: "error" as const,
      message: translationFailure
        ? "Translation is unavailable. Your message was not sent."
        : "Message could not be sent. Please try again or check the channel connection.",
      token: Date.now(),
    };
  }
}

export async function updateConversationFollowUp(formData: FormData) {
  await requireAdmin();
  const conversationId = String(formData.get("conversationId") ?? "");
  const enabled = formData.get("enabled") === "on";
  const delayMinutes = boundedInteger(formData.get("delayMinutes"), 15, 43200);
  const intervalMinutes = boundedInteger(
    formData.get("intervalMinutes"),
    60,
    43200,
  );
  const maxAttempts = boundedInteger(formData.get("maxAttempts"), 1, 5);
  const followUpMessage = String(formData.get("followUpMessage") ?? "")
    .trim()
    .slice(0, 600);
  if (
    !/^[0-9a-f-]{36}$/i.test(conversationId) ||
    delayMinutes === null ||
    intervalMinutes === null ||
    maxAttempts === null
  )
    throw new Error("Invalid follow-up settings.");
  const { error } = await createAdminClient()
    .from("conversations")
    .update({
      follow_up_enabled: enabled,
      follow_up_delay_minutes: delayMinutes,
      follow_up_interval_minutes: intervalMinutes,
      follow_up_max_attempts: maxAttempts,
      follow_up_attempts: 0,
      next_follow_up_at: enabled
        ? new Date(Date.now() + delayMinutes * 60_000).toISOString()
        : null,
      follow_up_message: followUpMessage || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", conversationId)
    .eq("channel", "sms");
  if (error) throw new Error("Unable to update follow-up settings.");
  revalidatePath("/admin/conversations");
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
    .in("channel", ["web_preview", "sms", "instagram"]);
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
    .in("channel", ["web_preview", "sms", "instagram"]);
  if (error) throw new Error("Unable to resume automatic replies.");
  revalidatePath("/admin/conversations");
  revalidatePath("/admin/leads");
}

function boundedInteger(
  value: FormDataEntryValue | null,
  minimum: number,
  maximum: number,
) {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  return Number.isInteger(parsed) && parsed >= minimum && parsed <= maximum
    ? parsed
    : null;
}
