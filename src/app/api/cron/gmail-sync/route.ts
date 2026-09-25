import { NextResponse, type NextRequest } from "next/server";

import { syncConnectedGmail } from "@/lib/gmail/sync";

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  const expected = process.env.CRON_SECRET;
  const supplied = request.headers.get("authorization");
  if (!expected || supplied !== `Bearer ${expected}`)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const result = await syncConnectedGmail();
    return NextResponse.json({ ok: true, imported: result.imported });
  } catch (error) {
    console.error("Gmail synchronization failed", {
      reason: error instanceof Error ? error.message : "unknown_error",
    });
    return NextResponse.json({ error: "Gmail sync failed" }, { status: 503 });
  }
}
