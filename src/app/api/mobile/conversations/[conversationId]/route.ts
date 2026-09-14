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
    return NextResponse.json({ error: "Invalid conversation" }, { status: 400 });
  const admin = createAdminClient();
  const conversation = await admin
    .from("conversations")
    .select(
      "id,channel,status,human_takeover,last_message_at,contacts(display_name,contact_channels(channel,normalized_address))",
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
  const messages = await admin
    .from("messages")
    .select("id,direction,sender_type,content,created_at,delivery_status")
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
    messages: (messages.data ?? []).map((message) => ({
      id: message.id,
      direction: message.direction,
      sender:
        message.sender_type === "human"
          ? "staff"
          : message.sender_type === "ai"
            ? "concierge"
            : "guest",
      body: message.content,
      createdAt: message.created_at,
      status: message.delivery_status,
    })),
  });
}
