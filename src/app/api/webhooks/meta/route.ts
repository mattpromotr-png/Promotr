import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  describeInstagramWebhookShape,
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
  const rawBody = Buffer.from(await request.arrayBuffer());
  const configuredSecrets = [
    { source: "instagram", value: process.env.META_INSTAGRAM_APP_SECRET },
    { source: "meta_basic", value: process.env.META_BASIC_APP_SECRET },
    { source: "legacy", value: process.env.META_APP_SECRET },
  ].filter((entry): entry is { source: string; value: string } =>
    Boolean(entry.value),
  );
  const usableSecrets = configuredSecrets.filter(
    (entry) => entry.value === entry.value.trim(),
  );
  const signature = request.headers.get("x-hub-signature-256");
  const validSignatureFormat = /^sha256=[a-fA-F0-9]{64}$/.test(signature || "");
  const matchedSecret = validSignatureFormat
    ? usableSecrets.find((entry) =>
        verifyMetaSignature(rawBody, signature, entry.value),
      )
    : undefined;
  const rejectionReason = !configuredSecrets.length
    ? "missing_app_secret"
    : !usableSecrets.length
      ? "app_secret_has_whitespace"
      : !signature
        ? "missing_signature_header"
        : !validSignatureFormat
          ? "malformed_signature_header"
          : !matchedSecret
            ? "signature_mismatch"
            : null;
  if (rejectionReason) {
    console.error("Meta webhook authentication rejected", {
      reason: rejectionReason,
    });
    return new NextResponse("Unauthorized", { status: 401 });
  }
  console.info("Meta webhook authenticated", {
    secretSource: matchedSecret?.source,
  });
  let payload: unknown;
  try {
    payload = JSON.parse(rawBody.toString("utf8"));
  } catch {
    return new NextResponse("Bad request", { status: 400 });
  }
  const events = normalizeInstagramEvents(payload);
  if (!events.length) {
    console.info("Meta webhook ignored", {
      reason: "no_supported_text_events",
      shape: describeInstagramWebhookShape(payload),
    });
    return NextResponse.json({ received: true });
  }
  const accountId = process.env.META_INSTAGRAM_ACCOUNT_ID;
  if (!accountId)
    return new NextResponse("Integration unavailable", { status: 503 });
  const n8nUrl = process.env.N8N_INSTAGRAM_WEBHOOK_URL;
  const n8nSecret = process.env.N8N_SHARED_SECRET;
  if (!n8nUrl || !n8nSecret)
    return new NextResponse("Integration unavailable", { status: 503 });
  const supabase = createAdminClient();

  for (const event of events) {
    if (event.recipientId !== accountId) {
      console.info("Meta webhook ignored", {
        reason: "recipient_not_configured",
      });
      continue;
    }
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
      console.info("Meta webhook forwarded to n8n");
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
