import { NextResponse } from "next/server";
import { authenticateMobileManager } from "@/lib/auth/mobile-manager";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  const manager = await authenticateMobileManager(request);
  if (!manager)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const payload = (await request.json().catch(() => null)) as {
    expoPushToken?: unknown;
    platform?: unknown;
  } | null;
  const token =
    typeof payload?.expoPushToken === "string" ? payload.expoPushToken : "";
  const platform = payload?.platform;
  if (
    !/^Expo(nent)?PushToken\[[\w-]+\]$/.test(token) ||
    !["ios", "android"].includes(String(platform))
  )
    return NextResponse.json({ error: "Invalid device" }, { status: 400 });
  const result = await createAdminClient().from("manager_devices").upsert(
    {
      staff_membership_id: manager.membershipId,
      expo_push_token: token,
      platform,
      notifications_enabled: true,
      last_seen_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "expo_push_token" },
  );
  if (result.error)
    return NextResponse.json(
      { error: "Unable to register device" },
      { status: 500 },
    );
  return NextResponse.json({ registered: true });
}
