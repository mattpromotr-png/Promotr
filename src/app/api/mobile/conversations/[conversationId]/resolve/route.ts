import { NextResponse } from "next/server";
import { authenticateMobileManager } from "@/lib/auth/mobile-manager";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ conversationId: string }> },
) {
  const manager = await authenticateMobileManager(request);
  if (!manager)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { conversationId } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(conversationId))
    return NextResponse.json({ error: "Invalid conversation" }, { status: 400 });
  const result = await createAdminClient()
    .from("conversations")
    .update({
      status: "open",
      handoff_reason: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", conversationId)
    .eq("venue_id", manager.venueId)
    .select("id")
    .maybeSingle();
  if (!result.data)
    return NextResponse.json(
      { error: "Conversation not found" },
      { status: 404 },
    );
  return NextResponse.json({ resolved: true });
}
