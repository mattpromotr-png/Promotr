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
