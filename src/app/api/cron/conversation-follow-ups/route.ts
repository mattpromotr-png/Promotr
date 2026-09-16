import { NextResponse } from "next/server";
import { translateStaffReply } from "@/lib/ai/translate-staff-reply";
import { normalizeLanguageName } from "@/lib/ai/language";
import { sendSmsConversationMessage } from "@/lib/messaging/sms-conversation";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const DEFAULT_FOLLOW_UP =
  "Hi! Just checking in—do you still need help planning your night? ✨";

export async function POST(request: Request) {
  if (!isAuthorized(request))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const admin = createAdminClient();
  const now = new Date().toISOString();
  const { data: due, error } = await admin
    .from("conversations")
    .select(
      "id,contact_id,next_follow_up_at,follow_up_interval_minutes,follow_up_max_attempts,follow_up_attempts,follow_up_message,contacts(preferred_language,contact_channels(channel,normalized_address))",
    )
    .eq("channel", "sms")
    .eq("follow_up_enabled", true)
    .neq("status", "closed")
    .not("next_follow_up_at", "is", null)
    .lte("next_follow_up_at", now)
    .order("next_follow_up_at", { ascending: true })
    .limit(25);
  if (error)
    return NextResponse.json(
      { error: "Unable to load due follow-ups" },
      { status: 500 },
    );

  let sent = 0;
  let failed = 0;
  for (const conversation of due ?? []) {
    const scheduledAt = conversation.next_follow_up_at;
    if (!scheduledAt) continue;
    const contact = Array.isArray(conversation.contacts)
      ? conversation.contacts[0]
      : conversation.contacts;
    const phone = contact?.contact_channels?.find(
      (channel) => channel.channel === "sms",
    )?.normalized_address;
    const { data: consent } = phone
      ? await admin
          .from("sms_consents")
          .select("status")
          .eq("phone_e164", phone)
          .maybeSingle()
      : { data: null };
    if (consent?.status !== "opted_in") {
      await admin
        .from("conversations")
        .update({
          follow_up_enabled: false,
          next_follow_up_at: null,
          updated_at: now,
        })
        .eq("id", conversation.id);
      continue;
    }
    const { data: claimed } = await admin
      .from("conversations")
      .update({ next_follow_up_at: null, updated_at: now })
      .eq("id", conversation.id)
      .eq("next_follow_up_at", scheduledAt)
      .select("id")
      .maybeSingle();
    if (!claimed) continue;
    try {
      const language = normalizeLanguageName(contact?.preferred_language);
      const originalEnglish =
        conversation.follow_up_message || DEFAULT_FOLLOW_UP;
      const delivered = await translateStaffReply(originalEnglish, language);
      await sendSmsConversationMessage({
        conversationId: conversation.id,
        content: delivered,
        senderType: "ai",
        metadata: {
          automatedFollowUp: true,
          detectedLanguage: language,
          englishTranslation: originalEnglish,
        },
      });
      const attempts = conversation.follow_up_attempts + 1;
      const complete = attempts >= conversation.follow_up_max_attempts;
      await admin
        .from("conversations")
        .update({
          follow_up_attempts: attempts,
          follow_up_enabled: !complete,
          follow_up_last_sent_at: new Date().toISOString(),
          next_follow_up_at: complete
            ? null
            : new Date(
                Date.now() + conversation.follow_up_interval_minutes * 60_000,
              ).toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", conversation.id);
      sent += 1;
    } catch (sendError) {
      failed += 1;
      const optedOut =
        sendError instanceof Error && sendError.message.includes("opted out");
      await admin
        .from("conversations")
        .update({
          follow_up_enabled: !optedOut,
          next_follow_up_at: optedOut
            ? null
            : new Date(Date.now() + 15 * 60_000).toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", conversation.id);
    }
  }

  return NextResponse.json({ checked: due?.length ?? 0, sent, failed });
}

function isAuthorized(request: Request) {
  const secret = process.env.CRON_SECRET;
  return Boolean(
    secret && request.headers.get("authorization") === `Bearer ${secret}`,
  );
}
