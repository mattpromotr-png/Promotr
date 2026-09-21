import { timingSafeEqual } from "node:crypto";
import { after, NextResponse } from "next/server";
import { normalizedInstagramEventSchema } from "@/lib/meta/webhook";
import { ingestInstagramEvent } from "@/lib/meta/ingest";
import { processInstagramConversation } from "@/lib/meta/process-conversation";

export const maxDuration = 60;

export async function POST(request: Request) {
  const configuredSecret = process.env.N8N_SHARED_SECRET;
  const suppliedSecret = request.headers.get("x-promotr-secret") || "";
  if (!configuredSecret || !secretsMatch(suppliedSecret, configuredSecret))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const payload = await request.json().catch(() => null);
  const event = normalizedInstagramEventSchema.safeParse(payload);
  if (!event.success)
    return NextResponse.json({ error: "Invalid event" }, { status: 400 });

  try {
    const result = await ingestInstagramEvent(event.data);
    if (!result.accepted) return NextResponse.json(result);
    after(async () => {
      try {
        await processInstagramConversation(result.conversationId);
      } catch (error) {
        console.error("Unable to process Instagram conversation", error);
      }
    });
    return NextResponse.json(result);
  } catch (error) {
    console.error("Unable to ingest Instagram event", error);
    return NextResponse.json({ error: "Temporary failure" }, { status: 503 });
  }
}

function secretsMatch(left: string, right: string) {
  const supplied = Buffer.from(left);
  const expected = Buffer.from(right);
  return (
    supplied.length === expected.length &&
    timingSafeEqual(supplied, expected)
  );
}
