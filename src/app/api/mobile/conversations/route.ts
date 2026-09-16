import { NextResponse } from "next/server";
import { authenticateMobileManager } from "@/lib/auth/mobile-manager";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(request: Request) {
  const manager = await authenticateMobileManager(request);
  if (!manager)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const channel = new URL(request.url).searchParams.get("channel");
  if (channel && !["sms", "instagram"].includes(channel))
    return NextResponse.json({ error: "Invalid channel" }, { status: 400 });

  const admin = createAdminClient();
  let query = admin
    .from("conversations")
    .select(
      "id,channel,status,human_takeover,last_message_at,contacts(display_name,contact_channels(channel,normalized_address))",
    )
    .eq("venue_id", manager.venueId)
    .in("channel", ["sms", "instagram"]);
  if (channel) query = query.eq("channel", channel);
  const result = await query
    .order("last_message_at", { ascending: false })
    .limit(100);
  if (result.error)
    return NextResponse.json(
      { error: "Unable to load conversations" },
      { status: 500 },
    );

  const ids = (result.data ?? []).map((item) => item.id);
  const latest = ids.length
    ? await admin
        .from("messages")
        .select("conversation_id,content,metadata,created_at")
        .in("conversation_id", ids)
        .order("created_at", { ascending: false })
    : { data: [] };
  const previews = new Map<string, { original: string; english?: string }>();
  for (const message of latest.data ?? [])
    if (!previews.has(message.conversation_id))
      previews.set(message.conversation_id, {
        original: message.content,
        english:
          typeof message.metadata === "object" &&
          message.metadata &&
          "englishTranslation" in message.metadata
            ? String(message.metadata.englishTranslation || "") || undefined
            : undefined,
      });

  return NextResponse.json(
    (result.data ?? []).map((item) => {
      const contact = Array.isArray(item.contacts)
        ? item.contacts[0]
        : item.contacts;
      const sms = contact?.contact_channels?.find(
        (entry) => entry.channel === "sms",
      );
      return {
        id: item.id,
        guestName:
          contact?.display_name ||
          (item.channel === "sms" ? "SMS guest" : "Instagram guest"),
        phone: sms?.normalized_address,
        channel: item.channel,
        preview:
          previews.get(item.id)?.english ||
          previews.get(item.id)?.original ||
          "Open conversation",
        updatedAt: item.last_message_at,
        unread: 0,
        needsFollowUp: item.status === "handoff_required",
        automationPaused: item.human_takeover,
      };
    }),
  );
}
