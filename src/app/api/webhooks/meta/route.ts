import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  normalizeInstagramEvents,
  verifyMetaSignature,
} from "@/lib/meta/webhook";

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams;
  if (
    query.get("hub.mode") === "subscribe" &&
    query.get("hub.verify_token") === process.env.META_VERIFY_TOKEN
  ) {
    return new NextResponse(query.get("hub.challenge") ?? "", { status: 200 });
  }
  return new NextResponse("Forbidden", { status: 403 });
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const appSecret = process.env.META_APP_SECRET;
  const signature = request.headers.get("x-hub-signature-256");
  const rejectionReason = !appSecret
    ? "missing_app_secret"
    : appSecret !== appSecret.trim()
      ? "app_secret_has_whitespace"
      : !signature
        ? "missing_signature_header"
        : !/^sha256=[a-f0-9]{64}$/i.test(signature)
          ? "malformed_signature_header"
          : !verifyMetaSignature(rawBody, signature, appSecret)
            ? "signature_mismatch"
            : null;
  if (rejectionReason) {
    console.error("Meta webhook authentication rejected", {
      reason: rejectionReason,
    });
    return new NextResponse("Unauthorized", { status: 401 });
  }
  let payload: unknown;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return new NextResponse("Bad request", { status: 400 });
  }
  const events = normalizeInstagramEvents(payload);
  const accountId = process.env.META_INSTAGRAM_ACCOUNT_ID;
  if (!accountId)
    return new NextResponse("Integration unavailable", { status: 503 });
  const n8nUrl = process.env.N8N_INSTAGRAM_WEBHOOK_URL;
  const n8nSecret = process.env.N8N_SHARED_SECRET;
  if (!n8nUrl || !n8nSecret)
    return new NextResponse("Integration unavailable", { status: 503 });
  const supabase = createAdminClient();

  for (const event of events) {
    if (event.recipientId !== accountId) continue;
    const { error } = await supabase.from("webhook_events").insert({
      provider_message_id: event.providerMessageId,
      normalized_event: event,
    });
    if (error?.code === "23505") {
      const { data: existing } = await supabase
        .from("webhook_events")
        .select("status")
        .eq("provider_message_id", event.providerMessageId)
        .single();
      if (existing?.status !== "failed") continue;
      await supabase
        .from("webhook_events")
        .update({ status: "received" })
        .eq("provider_message_id", event.providerMessageId);
    } else if (error)
      return new NextResponse("Storage unavailable", { status: 503 });
    try {
      const response = await fetch(n8nUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Promotr-Secret": n8nSecret,
        },
        body: JSON.stringify(event),
        signal: AbortSignal.timeout(18_000),
      });
      if (!response.ok) throw new Error("n8n rejected event");
      await supabase
        .from("webhook_events")
        .update({ status: "forwarded", forwarded_at: new Date().toISOString() })
        .eq("provider_message_id", event.providerMessageId);
    } catch {
      await supabase
        .from("webhook_events")
        .update({ status: "failed" })
        .eq("provider_message_id", event.providerMessageId);
      return new NextResponse("Temporary failure", { status: 503 });
    }
  }
  return NextResponse.json({ received: true });
}
