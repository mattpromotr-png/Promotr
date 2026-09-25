import { after, NextResponse, type NextRequest } from "next/server";

import { syncConnectedGmail } from "@/lib/gmail/sync";

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  const token = request.headers
    .get("authorization")
    ?.match(/^Bearer (.+)$/)?.[1];
  const audience = process.env.GMAIL_PUBSUB_AUDIENCE?.trim();
  const serviceAccount =
    process.env.GMAIL_PUBSUB_SERVICE_ACCOUNT_EMAIL?.trim().toLowerCase();
  if (!token || !audience || !serviceAccount)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const verification = await fetch(
    `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(token)}`,
    { cache: "no-store" },
  );
  if (!verification.ok)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const claims = (await verification.json()) as {
    aud?: string;
    email?: string;
    email_verified?: string;
    exp?: string;
  };
  if (
    claims.aud !== audience ||
    claims.email?.toLowerCase() !== serviceAccount ||
    claims.email_verified !== "true" ||
    Number(claims.exp || 0) * 1000 <= Date.now()
  )
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  after(async () => {
    try {
      await syncConnectedGmail();
    } catch (error) {
      console.error("Gmail push synchronization failed", {
        reason: error instanceof Error ? error.message : "unknown_error",
      });
    }
  });
  return new NextResponse(null, { status: 204 });
}
