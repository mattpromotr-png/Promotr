import { randomUUID } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getServerEnvironment } from "@/lib/env/server";
import { generateConciergeReply } from "@/lib/messaging/concierge";
import { conversationNeedsLostFoundForm } from "@/lib/messaging/policy";
import { getRateLimitKey } from "@/lib/security/request-key";
import { createAdminClient } from "@/lib/supabase/admin";
import { readVenueCalendar } from "@/lib/venue/calendar";
import { readActiveVenueKnowledge } from "@/lib/venue/knowledge";
import { readPublishedVenueInformation } from "@/lib/venue/published-information";

export const runtime = "nodejs";
export const maxDuration = 60;
const SESSION_COOKIE = "promotr_web_chat";
const inputSchema = z
  .object({
    content: z.string().trim().min(1).max(1000),
    messageId: z.string().uuid(),
  })
  .strict();
const uuid = z.string().uuid();
type Transcript = {
  humanTakeover?: boolean;
  messages?: Array<{
    id: string;
    sender_type: string;
    content: string;
    created_at: string;
  }>;
};
type Prepared = {
  conversationId?: string;
  inboundMessageId?: string;
  humanTakeover?: boolean;
  recentMessages?: Array<{ direction: string; content: string }>;
};

function reply(body: object, status: number, session?: string) {
  const response = NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
  if (session)
    response.cookies.set(SESSION_COOKIE, session, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });
  return response;
}

function publicMessages(value: unknown) {
  const data = value as Transcript | null;
  return (data?.messages || [])
    .filter((message) => message && typeof message.content === "string")
    .map(({ id, sender_type, content, created_at }) => ({
      id,
      sender:
        sender_type === "guest"
          ? "guest"
          : sender_type === "human"
            ? "staff"
            : "vera",
      content,
      createdAt: created_at,
    }));
}

export async function GET(request: NextRequest) {
  const session = request.cookies.get(SESSION_COOKIE)?.value;
  const conversationId = request.nextUrl.searchParams.get("conversationId");
  if (
    !uuid.safeParse(session).success ||
    !uuid.safeParse(conversationId).success
  )
    return reply({ messages: [], conversationId: null }, 200);
  const { data, error } = await createAdminClient().rpc(
    "get_webchat_messages",
    { p_conversation_id: conversationId!, p_session_id: session! },
  );
  if (error) return reply({ error: "Conversation unavailable." }, 404);
  return reply(
    {
      conversationId,
      messages: publicMessages(data),
      humanTakeover: Boolean((data as Transcript)?.humanTakeover),
    },
    200,
  );
}

export async function POST(request: NextRequest) {
  if (request.headers.get("origin") !== request.nextUrl.origin)
    return reply(
      { error: "This request must come from the Promotr website." },
      403,
    );
  if (Number(request.headers.get("content-length") || 0) > 4096)
    return reply({ error: "Message is too long." }, 413);
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return reply({ error: "Enter a message and try again." }, 400);
  }
  const parsed = inputSchema.safeParse(body);
  if (!parsed.success)
    return reply({ error: "Enter a message under 1,000 characters." }, 422);
  const session = uuid.safeParse(request.cookies.get(SESSION_COOKIE)?.value)
    .success
    ? request.cookies.get(SESSION_COOKIE)!.value
    : randomUUID();
  const admin = createAdminClient();
  try {
    const rateKey = getRateLimitKey(
      request.headers,
      getServerEnvironment().LEAD_RATE_LIMIT_SECRET,
    );
    const { data: permitted, error: quotaError } = await admin.rpc(
      "consume_web_chat_quota",
      { p_rate_key: rateKey },
    );
    if (quotaError)
      return reply(
        { error: "Website chat is temporarily unavailable." },
        503,
        session,
      );
    if (!permitted)
      return reply(
        { error: "You’ve sent a lot of messages. Please try again later." },
        429,
        session,
      );
    const providerMessageId = `web:${session}:${parsed.data.messageId}`;
    const { data: existing } = await admin
      .from("messages")
      .select("conversation_id")
      .eq("provider_message_id", providerMessageId)
      .maybeSingle();
    if (existing?.conversation_id) {
      const { data } = await admin.rpc("get_webchat_messages", {
        p_conversation_id: existing.conversation_id,
        p_session_id: session,
      });
      return reply(
        {
          conversationId: existing.conversation_id,
          messages: publicMessages(data),
          humanTakeover: Boolean((data as Transcript)?.humanTakeover),
        },
        200,
        session,
      );
    }
    const { data: prepared, error: prepareError } = await admin.rpc(
      "prepare_webchat_message",
      {
        p_session_id: session,
        p_provider_message_id: providerMessageId,
        p_content: parsed.data.content,
      },
    );
    const pending = prepared as Prepared | null;
    if (prepareError || !pending?.conversationId || !pending.inboundMessageId)
      return reply(
        { error: "Could not start the conversation. Please try again." },
        503,
        session,
      );
    if (pending.humanTakeover) {
      const { data } = await admin.rpc("get_webchat_messages", {
        p_conversation_id: pending.conversationId,
        p_session_id: session,
      });
      return reply(
        {
          conversationId: pending.conversationId,
          messages: publicMessages(data),
          humanTakeover: true,
        },
        200,
        session,
      );
    }
    const { data: conversation } = await admin
      .from("conversations")
      .select(
        "rolling_summary,contact_id,contacts(display_name,preferred_language,memory)",
      )
      .eq("id", pending.conversationId)
      .single();
    const { data: venue, error: venueError } = await admin
      .from("venues")
      .select("venue_facts")
      .eq("slug", "promotr-nightclub")
      .maybeSingle();
    const contact = Array.isArray(conversation?.contacts)
      ? conversation.contacts[0]
      : conversation?.contacts;
    const recent = (pending.recentMessages || []).slice(-8).map((item) => ({
      role:
        item.direction === "inbound"
          ? ("user" as const)
          : ("assistant" as const),
      content: item.content,
    }));
    if (!recent.length || recent.at(-1)?.role !== "user")
      return reply(
        { error: "Conversation could not be loaded." },
        503,
        session,
      );
    const result = await generateConciergeReply(recent, {
      venueSourcesLoaded: !venueError && Boolean(venue),
      venueInformation: readPublishedVenueInformation(venue?.venue_facts),
      venueKnowledge: readActiveVenueKnowledge(venue?.venue_facts),
      venueCalendar: readVenueCalendar(venue?.venue_facts),
      summary: conversation?.rolling_summary,
      knownName: contact?.display_name,
      preferredLanguage: contact?.preferred_language,
      contactMemory: contact?.memory as Record<string, unknown> | null,
    });
    const appUrl = getServerEnvironment().NEXT_PUBLIC_APP_URL;
    const links: string[] = [];
    if (result.shareBookingForm) {
      const url = new URL("/book", appUrl);
      url.searchParams.set("conversation", pending.conversationId);
      links.push(`Booking inquiry: ${url.toString()}`);
    }
    if (conversationNeedsLostFoundForm(recent)) {
      const url = new URL("/lost-found", appUrl);
      url.searchParams.set("conversation", pending.conversationId);
      links.push(`Lost-item report: ${url.toString()}`);
    }
    const delivered = [
      result.reply.replace(/https?:\/\/\S+/gi, "").trim(),
      ...links,
    ].join("\n\n");
    const { error: completeError } = await admin.rpc("complete_webchat_reply", {
      p_conversation_id: pending.conversationId,
      p_content: delivered,
      p_intent: result.intent,
      p_handoff_required: result.handoffRequired,
      p_handoff_reason: result.handoffReason,
      p_metadata: {
        detectedLanguage: result.detectedLanguage,
        englishTranslation: result.replyEnglish,
        webChat: true,
      },
    });
    if (completeError)
      return reply(
        { error: "Could not deliver the reply. Please try again shortly." },
        503,
        session,
      );
    await admin
      .from("conversations")
      .update({
        rolling_summary: result.conversationSummary,
        updated_at: new Date().toISOString(),
      })
      .eq("id", pending.conversationId);
    const { data: transcript } = await admin.rpc("get_webchat_messages", {
      p_conversation_id: pending.conversationId,
      p_session_id: session,
    });
    return reply(
      {
        conversationId: pending.conversationId,
        messages: publicMessages(transcript),
        humanTakeover: result.handoffRequired,
      },
      200,
      session,
    );
  } catch (error) {
    console.error("Website chat failed", {
      name: error instanceof Error ? error.name : "UnknownError",
    });
    return reply(
      { error: "Chat is temporarily unavailable. Please try again later." },
      503,
      session,
    );
  }
}
