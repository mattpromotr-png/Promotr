import { NextResponse } from "next/server";
import { getServerEnvironment } from "@/lib/env/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createUserClient } from "@/lib/supabase/server";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ conversationId: string }> },
) {
  const userClient = await createUserClient();
  const {
    data: { user },
  } = await userClient.auth.getUser();
  if (
    !user ||
    user.email?.toLowerCase() !==
      getServerEnvironment().ADMIN_EMAIL.toLowerCase()
  )
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { conversationId } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(conversationId))
    return NextResponse.json(
      { error: "Invalid conversation" },
      { status: 400 },
    );

  const result = await createAdminClient()
    .from("messages")
    .select("id,sender_type,content,metadata,created_at")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: false })
    .limit(200);
  if (result.error)
    return NextResponse.json(
      { error: "Unable to load conversation" },
      { status: 500 },
    );
  return NextResponse.json({ messages: (result.data ?? []).reverse() });
}
