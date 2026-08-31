import { redirect } from "next/navigation";
import { getServerEnvironment } from "@/lib/env/server";
import { createUserClient } from "@/lib/supabase/server";

export async function requireAdmin() {
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
  return user;
}
