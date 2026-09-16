import { NextResponse } from "next/server";
import { authenticateMobileManager } from "@/lib/auth/mobile-manager";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ conversationId: string }> },
) {
  const manager = await authenticateMobileManager(request);
  if (!manager)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { conversationId } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(conversationId))
    return NextResponse.json(
      { error: "Invalid conversation" },
      { status: 400 },
    );
  const admin = createAdminClient();
  const conversation = await admin
    .from("conversations")
    .select(
      "id,channel,status,human_takeover,last_message_at,follow_up_enabled,follow_up_delay_minutes,follow_up_interval_minutes,follow_up_max_attempts,follow_up_attempts,next_follow_up_at,follow_up_message,contacts(display_name,preferred_language,contact_channels(channel,normalized_address))",
    )
    .eq("id", conversationId)
    .eq("venue_id", manager.venueId)
    .in("channel", ["sms", "instagram"])
    .maybeSingle();
  if (!conversation.data)
    return NextResponse.json(
      { error: "Conversation not found" },
      { status: 404 },
    );
  await admin.rpc("mark_manager_conversation_read", {
    p_staff_membership_id: manager.membershipId,
    p_conversation_id: conversationId,
  });
  const messages = await admin
    .from("messages")
    .select(
      "id,direction,sender_type,content,metadata,created_at,delivery_status",
    )
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true })
    .limit(200);
  if (messages.error)
    return NextResponse.json(
      { error: "Unable to load messages" },
      { status: 500 },
    );
  const contact = Array.isArray(conversation.data.contacts)
    ? conversation.data.contacts[0]
    : conversation.data.contacts;
  const sms = contact?.contact_channels?.find(
    (entry) => entry.channel === "sms",
  );
  return NextResponse.json({
    id: conversation.data.id,
    guestName:
      contact?.display_name ||
      (conversation.data.channel === "sms" ? "SMS guest" : "Instagram guest"),
    phone: sms?.normalized_address,
    channel: conversation.data.channel,
    preview: messages.data?.at(-1)?.content || "",
    updatedAt: conversation.data.last_message_at,
    unread: 0,
    needsFollowUp: conversation.data.status === "handoff_required",
    automationPaused: conversation.data.human_takeover,
    preferredLanguage: contact?.preferred_language,
    followUp: {
      enabled: conversation.data.follow_up_enabled,
      delayMinutes: conversation.data.follow_up_delay_minutes,
      intervalMinutes: conversation.data.follow_up_interval_minutes,
      maxAttempts: conversation.data.follow_up_max_attempts,
      attempts: conversation.data.follow_up_attempts,
      nextAt: conversation.data.next_follow_up_at,
      message: conversation.data.follow_up_message,
    },
    messages: (messages.data ?? [])
      .filter(
        (message) =>
          !(
            typeof message.metadata === "object" &&
            message.metadata &&
            "adminGroupedInto" in message.metadata
          ),
      )
      .map((message) => ({
        id: message.id,
        direction: message.direction,
        sender:
          message.sender_type === "human"
            ? "staff"
            : message.sender_type === "ai"
              ? "concierge"
              : "guest",
        body: adminEnglishBody(message.content, message.metadata),
        createdAt: message.created_at,
        status: message.delivery_status,
      })),
  });
}

function adminEnglishBody(content: string, metadata: unknown) {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata))
    return content;
  const value = metadata as Record<string, unknown>;
  return String(
    value.adminOriginalEnglish || value.englishTranslation || content,
  );
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ conversationId: string }> },
) {
  const manager = await authenticateMobileManager(request);
  if (!manager)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { conversationId } = await params;
  const body = (await request.json().catch(() => null)) as {
    enabled?: unknown;
    delayMinutes?: unknown;
    intervalMinutes?: unknown;
    maxAttempts?: unknown;
    message?: unknown;
  } | null;
  const enabled = body?.enabled === true;
  const delayMinutes = boundedNumber(body?.delayMinutes, 15, 43200);
  const intervalMinutes = boundedNumber(body?.intervalMinutes, 60, 43200);
  const maxAttempts = boundedNumber(body?.maxAttempts, 1, 5);
  const message = typeof body?.message === "string" ? body.message.trim() : "";
  if (
    !/^[0-9a-f-]{36}$/i.test(conversationId) ||
    delayMinutes === null ||
    intervalMinutes === null ||
    maxAttempts === null ||
    message.length > 600
  )
    return NextResponse.json({ error: "Invalid settings" }, { status: 400 });
  const { data, error } = await createAdminClient()
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
      follow_up_message: message || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", conversationId)
    .eq("venue_id", manager.venueId)
    .eq("channel", "sms")
    .select("id")
    .maybeSingle();
  if (error || !data)
    return NextResponse.json(
      { error: "Unable to update follow-up" },
      { status: 500 },
    );
  return NextResponse.json({ updated: true });
}

function boundedNumber(value: unknown, minimum: number, maximum: number) {
  const parsed = typeof value === "number" ? value : Number.NaN;
  return Number.isInteger(parsed) && parsed >= minimum && parsed <= maximum
    ? parsed
    : null;
}
