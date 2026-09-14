import { getServerEnvironment } from "@/lib/env/server";
import { createAdminClient } from "@/lib/supabase/admin";

export type MobileManager = {
  userId: string;
  email: string;
  venueId: string;
  membershipId: string;
  role: "owner" | "manager" | "staff";
};

export async function authenticateMobileManager(
  request: Request,
): Promise<MobileManager | null> {
  const token = request.headers
    .get("authorization")
    ?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) return null;

  const admin = createAdminClient();
  const { data, error } = await admin.auth.getUser(token);
  const user = data.user;
  const email = user?.email?.toLowerCase();
  if (error || !user || !email) return null;

  const membership = await admin
    .from("staff_memberships")
    .select("id,venue_id,role")
    .eq("user_id", user.id)
    .eq("active", true)
    .limit(1)
    .maybeSingle();
  if (membership.data)
    return {
      userId: user.id,
      email,
      venueId: membership.data.venue_id,
      membershipId: membership.data.id,
      role: membership.data.role,
    } as MobileManager;

  if (email !== getServerEnvironment().ADMIN_EMAIL.toLowerCase()) return null;
  const venue = await admin
    .from("venues")
    .select("id")
    .eq("slug", "promotr-nightclub")
    .single();
  if (!venue.data) return null;
  const created = await admin
    .from("staff_memberships")
    .upsert(
      { venue_id: venue.data.id, user_id: user.id, role: "owner", active: true },
      { onConflict: "venue_id,user_id" },
    )
    .select("id,venue_id,role")
    .single();
  if (!created.data) return null;
  return {
    userId: user.id,
    email,
    venueId: created.data.venue_id,
    membershipId: created.data.id,
    role: created.data.role,
  } as MobileManager;
}
