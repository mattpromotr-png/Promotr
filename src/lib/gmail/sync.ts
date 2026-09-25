import "server-only";

import {
  getGmailMessage,
  getGmailProfile,
  gmailHeader,
  gmailText,
  listGmailHistory,
  startGmailWatch,
} from "@/lib/gmail/client";
import {
  gmailAccessToken,
  loadGmailConnection,
  type GmailConnection,
} from "@/lib/gmail/connection";
import { processEmailConversation } from "@/lib/gmail/process-conversation";
import { notifyVenueManagers } from "@/lib/notifications/manager-push";
import { createAdminClient } from "@/lib/supabase/admin";

export async function syncConnectedGmail(venueId?: string) {
  const connection = await loadGmailConnection(venueId);
  const admin = createAdminClient();
  try {
    const accessToken = await gmailAccessToken(connection);
    const profile = await getGmailProfile(accessToken);
    if (!connection.history_id) {
      await updateConnection(connection.id, {
        history_id: profile.historyId,
        last_synced_at: new Date().toISOString(),
        last_error: null,
      });
      await renewWatchIfNeeded(connection, accessToken);
      return { imported: 0 };
    }

    let history: Awaited<ReturnType<typeof listGmailHistory>>;
    try {
      history = await listGmailHistory(accessToken, connection.history_id);
    } catch (error) {
      if (statusOf(error) !== 404) throw error;
      await updateConnection(connection.id, {
        history_id: profile.historyId,
        last_synced_at: new Date().toISOString(),
        last_error: null,
      });
      return { imported: 0 };
    }

    let imported = 0;
    for (const messageId of history.messageIds) {
      const message = await getGmailMessage(accessToken, messageId);
      if (!message) continue;
      if (!message.labelIds?.includes("INBOX")) continue;
      const from = parseMailbox(gmailHeader(message, "From") || "");
      if (!from.email || from.email === connection.email_address.toLowerCase())
        continue;
      if (isAutomaticEmail(message)) continue;
      const content = cleanEmailText(gmailText(message));
      if (!content) continue;
      const conversationId = await storeInboundEmail({
        connection,
        messageId: message.id,
        threadId: message.threadId,
        senderEmail: from.email,
        senderName: from.name,
        content,
        subject: gmailHeader(message, "Subject") || "Promotr inquiry",
        internetMessageId: gmailHeader(message, "Message-ID"),
        inReplyTo: gmailHeader(message, "In-Reply-To"),
        references: gmailHeader(message, "References"),
        receivedAt: message.internalDate
          ? new Date(Number(message.internalDate)).toISOString()
          : new Date().toISOString(),
      });
      if (!conversationId) continue;
      imported += 1;
      try {
        await notifyVenueManagers({
          venueId: connection.venue_id,
          conversationId,
          channel: "email",
          title: `New email from ${from.name || from.email}`,
          body: content.slice(0, 240),
          kind: "new_message",
        });
      } catch (error) {
        console.error("Unable to notify managers about email", error);
      }
      await processEmailConversation(conversationId);
    }
    await updateConnection(connection.id, {
      history_id: history.historyId,
      last_synced_at: new Date().toISOString(),
      last_error: null,
      status: "connected",
    });
    await renewWatchIfNeeded(connection, accessToken);
    return { imported };
  } catch (error) {
    const reason =
      error instanceof Error ? error.message.slice(0, 300) : "Unknown error";
    await admin
      .from("gmail_connections")
      .update({
        status: "error",
        last_error: reason,
        updated_at: new Date().toISOString(),
      })
      .eq("id", connection.id);
    throw error;
  }
}

async function storeInboundEmail(input: {
  connection: GmailConnection;
  messageId: string;
  threadId: string;
  senderEmail: string;
  senderName: string | null;
  content: string;
  subject: string;
  internetMessageId?: string;
  inReplyTo?: string;
  references?: string;
  receivedAt: string;
}) {
  const admin = createAdminClient();
  const providerMessageId = `gmail:${input.messageId}`;
  const { data: duplicate } = await admin
    .from("messages")
    .select("id")
    .eq("provider_message_id", providerMessageId)
    .maybeSingle();
  if (duplicate) return null;

  let { data: identity } = await admin
    .from("contact_channels")
    .select("id,contact_id")
    .eq("venue_id", input.connection.venue_id)
    .eq("channel", "email")
    .eq("normalized_address", input.senderEmail)
    .maybeSingle();
  if (!identity) {
    const { data: contact } = await admin
      .from("contacts")
      .upsert(
        {
          venue_id: input.connection.venue_id,
          instagram_scoped_id: `email:${input.senderEmail}`,
          display_name: input.senderName,
          last_seen_at: new Date().toISOString(),
        },
        { onConflict: "venue_id,instagram_scoped_id" },
      )
      .select("id")
      .single();
    if (!contact) return null;
    identity = (
      await admin
        .from("contact_channels")
        .upsert(
          {
            venue_id: input.connection.venue_id,
            contact_id: contact.id,
            channel: "email",
            external_address: input.senderEmail,
            normalized_address: input.senderEmail,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "venue_id,channel,normalized_address" },
        )
        .select("id,contact_id")
        .single()
    ).data;
  }
  if (!identity) return null;
  if (input.senderName)
    await admin
      .from("contacts")
      .update({
        display_name: input.senderName,
        last_seen_at: new Date().toISOString(),
      })
      .eq("id", identity.contact_id);

  const { data: conversation } = await admin
    .from("conversations")
    .upsert(
      {
        venue_id: input.connection.venue_id,
        contact_id: identity.contact_id,
        channel: "email",
        last_message_at: input.receivedAt,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "venue_id,contact_id,channel" },
    )
    .select("id")
    .single();
  if (!conversation) return null;
  const { error } = await admin.from("messages").insert({
    conversation_id: conversation.id,
    provider_message_id: providerMessageId,
    direction: "inbound",
    sender_type: "guest",
    content: input.content,
    delivery_status: "received",
    created_at: input.receivedAt,
    metadata: {
      gmail: {
        id: input.messageId,
        threadId: input.threadId,
        subject: input.subject,
        messageId: input.internetMessageId,
        inReplyTo: input.inReplyTo,
        references: input.references,
        from: input.senderEmail,
      },
    },
  });
  if (error) {
    if (error.code !== "23505")
      console.error("Unable to store inbound email", { code: error.code });
    return null;
  }

  const { data: lead } = await admin
    .from("leads")
    .select("id")
    .eq("venue_id", input.connection.venue_id)
    .ilike("email", input.senderEmail)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (lead)
    await admin
      .from("lead_conversations")
      .upsert(
        { lead_id: lead.id, conversation_id: conversation.id },
        { onConflict: "lead_id,conversation_id", ignoreDuplicates: true },
      );
  return conversation.id;
}

async function renewWatchIfNeeded(
  connection: GmailConnection,
  accessToken: string,
) {
  if (!process.env.GMAIL_PUBSUB_TOPIC?.trim()) return;
  const expiration = connection.watch_expiration
    ? new Date(connection.watch_expiration).getTime()
    : 0;
  if (expiration > Date.now() + 48 * 60 * 60 * 1000) return;
  const watch = await startGmailWatch(accessToken);
  if (!watch) return;
  await updateConnection(connection.id, {
    watch_expiration: new Date(Number(watch.expiration)).toISOString(),
  });
}

async function updateConnection(id: string, values: Record<string, unknown>) {
  const { error } = await createAdminClient()
    .from("gmail_connections")
    .update({ ...values, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw new Error("Unable to update Gmail connection.");
}

export function parseMailbox(value: string) {
  const match = value.match(/^(.*?)<([^>]+)>\s*$/);
  const email = (match?.[2] || value).trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email))
    return { email: "", name: null };
  const rawName = match?.[1]?.trim().replace(/^"|"$/g, "") || "";
  return { email, name: rawName || null };
}

function isAutomaticEmail(message: Parameters<typeof gmailHeader>[0]) {
  const autoSubmitted = gmailHeader(message, "Auto-Submitted")?.toLowerCase();
  const precedence = gmailHeader(message, "Precedence")?.toLowerCase();
  return Boolean(
    (autoSubmitted && autoSubmitted !== "no") ||
    precedence === "bulk" ||
    precedence === "list" ||
    gmailHeader(message, "List-Unsubscribe"),
  );
}

export function cleanEmailText(value: string) {
  const lines = value.replace(/\r/g, "").split("\n");
  const kept: string[] = [];
  for (const line of lines) {
    if (/^On .+wrote:$/i.test(line.trim())) break;
    if (/^From:\s.+@/i.test(line.trim()) && kept.length > 0) break;
    if (/^-{2,}\s*Original Message\s*-{2,}$/i.test(line.trim())) break;
    if (line.trim().startsWith(">")) continue;
    kept.push(line);
  }
  return kept
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, 4000);
}

function statusOf(error: unknown) {
  return typeof error === "object" && error && "status" in error
    ? Number((error as { status?: unknown }).status)
    : 0;
}
