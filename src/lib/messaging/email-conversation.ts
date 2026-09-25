import "server-only";

import { encodeBase64Url, sendGmailMessage } from "@/lib/gmail/client";
import { gmailAccessToken, loadGmailConnection } from "@/lib/gmail/connection";
import { createAdminClient } from "@/lib/supabase/admin";

type GmailMetadata = {
  threadId?: string;
  subject?: string;
  messageId?: string;
  references?: string;
};

export async function sendEmailConversationMessage(input: {
  conversationId: string;
  content: string;
  senderType?: "human" | "ai";
  metadata?: Record<string, unknown>;
}) {
  const admin = createAdminClient();
  const { data: conversation } = await admin
    .from("conversations")
    .select("id,contact_id,venue_id,channel")
    .eq("id", input.conversationId)
    .single();
  if (conversation?.channel !== "email")
    throw new Error("Email conversation not found.");
  const [{ data: identity }, { data: latestInbound }] = await Promise.all([
    admin
      .from("contact_channels")
      .select("normalized_address")
      .eq("contact_id", conversation.contact_id)
      .eq("channel", "email")
      .single(),
    admin
      .from("messages")
      .select("metadata")
      .eq("conversation_id", conversation.id)
      .eq("direction", "inbound")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);
  if (!identity?.normalized_address)
    throw new Error("Email destination not found.");
  const gmail = asGmailMetadata(latestInbound?.metadata);
  if (!gmail.threadId) throw new Error("The email thread is unavailable.");

  const connection = await loadGmailConnection(conversation.venue_id);
  const { data: stored, error: insertError } = await admin
    .from("messages")
    .insert({
      conversation_id: conversation.id,
      direction: "outbound",
      sender_type: input.senderType || "human",
      content: input.content,
      delivery_status: "pending",
      metadata: {
        ...input.metadata,
        sentFromAdmin: (input.senderType || "human") === "human",
        gmail: {
          threadId: gmail.threadId,
          subject: gmail.subject,
          inReplyTo: gmail.messageId,
          references: gmail.references,
        },
      },
    })
    .select("id")
    .single();
  if (insertError || !stored) throw new Error("Unable to store email reply.");

  try {
    const raw = buildReplyMime({
      from: connection.email_address,
      to: identity.normalized_address,
      subject: gmail.subject || "Promotr inquiry",
      content: input.content,
      inReplyTo: gmail.messageId,
      references: gmail.references,
    });
    const sent = await sendGmailMessage(await gmailAccessToken(connection), {
      raw: encodeBase64Url(raw),
      threadId: gmail.threadId,
    });
    await Promise.all([
      admin
        .from("messages")
        .update({
          provider_message_id: `gmail:${sent.id}`,
          delivery_status: "sent",
          metadata: {
            ...input.metadata,
            sentFromAdmin: (input.senderType || "human") === "human",
            gmail: {
              id: sent.id,
              threadId: sent.threadId,
              subject: gmail.subject,
              inReplyTo: gmail.messageId,
              references: gmail.references,
            },
          },
        })
        .eq("id", stored.id),
      admin
        .from("conversations")
        .update({
          last_message_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", conversation.id),
    ]);
    return sent.id;
  } catch (error) {
    await admin
      .from("messages")
      .update({ delivery_status: "failed" })
      .eq("id", stored.id);
    throw error;
  }
}

export function buildReplyMime(input: {
  from: string;
  to: string;
  subject: string;
  content: string;
  inReplyTo?: string;
  references?: string;
}) {
  const subject = input.subject.toLowerCase().startsWith("re:")
    ? input.subject
    : `Re: ${input.subject}`;
  const headers = [
    `From: ${safeHeader(input.from)}`,
    `To: ${safeHeader(input.to)}`,
    `Subject: ${encodeHeader(subject)}`,
    "MIME-Version: 1.0",
    'Content-Type: text/plain; charset="UTF-8"',
    "Content-Transfer-Encoding: 8bit",
  ];
  if (input.inReplyTo)
    headers.push(`In-Reply-To: ${safeHeader(input.inReplyTo)}`);
  const references = [input.references, input.inReplyTo]
    .filter(Boolean)
    .join(" ")
    .trim();
  if (references) headers.push(`References: ${safeHeader(references)}`);
  return `${headers.join("\r\n")}\r\n\r\n${input.content.replace(/\r?\n/g, "\r\n")}`;
}

function safeHeader(value: string) {
  return value.replace(/[\r\n]+/g, " ").trim();
}

function encodeHeader(value: string) {
  const safe = safeHeader(value);
  return /^[\x20-\x7e]*$/.test(safe)
    ? safe
    : `=?UTF-8?B?${Buffer.from(safe).toString("base64")}?=`;
}

function asGmailMetadata(value: unknown): GmailMetadata {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const gmail = (value as { gmail?: unknown }).gmail;
  return gmail && typeof gmail === "object" && !Array.isArray(gmail)
    ? (gmail as GmailMetadata)
    : {};
}
