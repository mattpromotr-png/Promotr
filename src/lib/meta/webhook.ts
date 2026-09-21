import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";

export const normalizedInstagramEventSchema = z.object({
  providerMessageId: z.string().min(1),
  senderId: z.string().min(1),
  recipientId: z.string().min(1),
  text: z.string().trim().min(1).max(4000),
  timestamp: z.number().int().nonnegative(),
  channel: z.literal("instagram"),
});
export type NormalizedInstagramEvent = z.infer<
  typeof normalizedInstagramEventSchema
>;

// Deliberately log only a fixed set of booleans and known event names. Never
// log arbitrary keys, IDs, message text, attachment URLs, or raw payloads.
export function describeInstagramWebhookShape(payload: unknown) {
  const root =
    payload && typeof payload === "object"
      ? (payload as Record<string, unknown>)
      : {};
  const entries = Array.isArray(root.entry) ? root.entry : [];
  const messaging = entries.flatMap((entry) => {
    if (!entry || typeof entry !== "object") return [];
    const items = (entry as { messaging?: unknown }).messaging;
    return Array.isArray(items) ? items : [];
  });
  const changes = entries.flatMap((entry) => {
    if (!entry || typeof entry !== "object") return [];
    const items = (entry as { changes?: unknown }).changes;
    return Array.isArray(items) ? items : [];
  });
  const knownFields = [
    "messages",
    "messaging_postbacks",
    "message_reactions",
    "messaging_seen",
  ];
  return {
    object: root.object === "instagram" ? "instagram" : "other",
    entryCount: entries.length,
    messagingCount: messaging.length,
    changesCount: changes.length,
    changeFields: [
      ...new Set(
        changes.map((change) => {
          const field =
            change && typeof change === "object"
              ? (change as { field?: unknown }).field
              : undefined;
          return typeof field === "string" && knownFields.includes(field)
            ? field
            : "other";
        }),
      ),
    ],
    messaging: messaging.slice(0, 5).map((item) => {
      const event =
        item && typeof item === "object"
          ? (item as Record<string, unknown>)
          : {};
      const message =
        event.message && typeof event.message === "object"
          ? (event.message as Record<string, unknown>)
          : {};
      return {
        hasSender: Boolean((event.sender as { id?: unknown } | undefined)?.id),
        hasRecipient: Boolean(
          (event.recipient as { id?: unknown } | undefined)?.id,
        ),
        hasMessage: Boolean(event.message),
        hasMid: Boolean(message.mid),
        hasText:
          typeof message.text === "string" && message.text.trim().length > 0,
        isEcho: message.is_echo === true,
        hasPostback: Boolean(event.postback),
        hasRead: Boolean(event.read),
        hasDelivery: Boolean(event.delivery),
      };
    }),
  };
}

export function verifyMetaSignature(
  rawBody: Buffer,
  signature: string | null,
  appSecret: string,
) {
  if (!signature?.startsWith("sha256=")) return false;
  const supplied = Buffer.from(signature.slice(7), "hex");
  const expected = Buffer.from(
    createHmac("sha256", appSecret).update(rawBody).digest("hex"),
    "hex",
  );
  return (
    supplied.length === expected.length && timingSafeEqual(supplied, expected)
  );
}

export function normalizeInstagramEvents(
  payload: unknown,
): NormalizedInstagramEvent[] {
  if (!payload || typeof payload !== "object") return [];
  const entries = (payload as { entry?: unknown[] }).entry;
  if (!Array.isArray(entries)) return [];
  const results: NormalizedInstagramEvent[] = [];
  for (const entry of entries) {
    if (!entry || typeof entry !== "object") continue;
    const record = entry as { time?: number; messaging?: unknown[] };
    if (!Array.isArray(record.messaging)) continue;
    for (const item of record.messaging) {
      if (!item || typeof item !== "object") continue;
      const event = item as {
        sender?: { id?: string };
        recipient?: { id?: string };
        timestamp?: number;
        message?: { mid?: string; text?: string; is_echo?: boolean };
      };
      if (
        event.message?.is_echo ||
        !event.message?.mid ||
        !event.message.text ||
        !event.sender?.id ||
        !event.recipient?.id
      )
        continue;
      const parsed = normalizedInstagramEventSchema.safeParse({
        providerMessageId: event.message.mid,
        senderId: event.sender.id,
        recipientId: event.recipient.id,
        text: event.message.text,
        timestamp: event.timestamp ?? record.time ?? Date.now(),
        channel: "instagram",
      });
      if (parsed.success) results.push(parsed.data);
    }
  }
  return results;
}
