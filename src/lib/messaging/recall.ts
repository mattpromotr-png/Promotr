import "server-only";

import type { createAdminClient } from "@/lib/supabase/admin";

type AdminClient = ReturnType<typeof createAdminClient>;

export type RecallExcerpt = {
  channel: string;
  role: "guest" | "venue";
  content: string;
};

export function asksAboutPastConversation(message: string) {
  return /\b(?:remember\s+(?:me|what|when|that|our)|what\s+did\s+(?:i|we)\s+(?:say|tell|ask)|did\s+i\s+(?:say|tell)|last\s+time|previous\s+(?:chat|conversation)|earlier\s+(?:i|we)\s+(?:said|asked))\b/i.test(
    message,
  );
}

export async function loadRecallExcerpts(
  admin: AdminClient,
  venueId: string,
  contactId: string,
  latestMessage: string,
): Promise<RecallExcerpt[]> {
  if (!asksAboutPastConversation(latestMessage)) return [];

  // A contact may own several verified channels. Never search by a guest name,
  // unverified phone number, or across different contact/venue IDs.
  const { data: conversations, error: conversationError } = await admin
    .from("conversations")
    .select("id,channel")
    .eq("venue_id", venueId)
    .eq("contact_id", contactId)
    .limit(10);
  if (conversationError || !conversations?.length) return [];

  const channelById = new Map(
    conversations.map((conversation) => [
      conversation.id,
      conversation.channel,
    ]),
  );
  const { data: messages, error: messageError } = await admin
    .from("messages")
    .select("conversation_id,direction,content")
    .in("conversation_id", [...channelById.keys()])
    .order("created_at", { ascending: false })
    .limit(24);
  if (messageError || !messages) return [];

  return messages.reverse().map((message) => ({
    channel: channelById.get(message.conversation_id) || "unknown",
    role: message.direction === "inbound" ? "guest" : "venue",
    content: message.content.slice(0, 300),
  }));
}
