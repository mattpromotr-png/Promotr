import { redirect } from "next/navigation";
import { getServerEnvironment } from "@/lib/env/server";
import { createUserClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function requireAdmin() {
  const startedAt = performance.now();
  const supabase = await createUserClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/admin/login");
  if (
    user.email?.toLowerCase() !==
    getServerEnvironment().ADMIN_EMAIL.toLowerCase()
  )
    redirect("/admin/login?error=unauthorized");
  const admin = createAdminClient();
  const existing = await admin
    .from("staff_memberships")
    .select("id")
    .eq("user_id", user.id)
    .eq("active", true)
    .limit(1)
    .maybeSingle();
  if (!existing.data) {
    const venue = await admin
      .from("venues")
      .select("id")
      .eq("slug", "promotr-nightclub")
      .single();
    if (venue.data)
      await admin.from("staff_memberships").upsert(
        {
          venue_id: venue.data.id,
          user_id: user.id,
          role: "owner",
          active: true,
        },
        { onConflict: "venue_id,user_id" },
      );
  }
  const durationMs = Math.round(performance.now() - startedAt);
  if (durationMs >= 500) {
    console.info("Slow admin authorization", { durationMs });
  }
  return user;
}
