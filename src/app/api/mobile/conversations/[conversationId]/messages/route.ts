import { NextResponse } from "next/server";
import { authenticateMobileManager } from "@/lib/auth/mobile-manager";
import { sendSmsConversationMessage } from "@/lib/messaging/sms-conversation";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ conversationId: string }> },
) {
  const manager = await authenticateMobileManager(request);
  if (!manager)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { conversationId } = await params;
  const payload = (await request.json().catch(() => null)) as {
    body?: unknown;
  } | null;
  const body = typeof payload?.body === "string" ? payload.body.trim() : "";
  if (!/^[0-9a-f-]{36}$/i.test(conversationId) || !body || body.length > 1000)
    return NextResponse.json({ error: "Invalid message" }, { status: 400 });
  const conversation = await createAdminClient()
    .from("conversations")
    .select("channel")
    .eq("id", conversationId)
    .eq("venue_id", manager.venueId)
    .maybeSingle();
  if (!conversation.data)
    return NextResponse.json(
      { error: "Conversation not found" },
      { status: 404 },
    );
  if (conversation.data.channel !== "sms")
    return NextResponse.json(
      { error: "Instagram replies require the Meta messaging connection" },
      { status: 409 },
    );
  try {
    await sendSmsConversationMessage({ conversationId, content: body });
    return NextResponse.json({ sent: true });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Unable to send message",
      },
      { status: 502 },
    );
  }
}
