"use server";

import { redirect } from "next/navigation";
import { ensureAdminMembership } from "@/lib/auth/admin";
import { createUserClient } from "@/lib/supabase/server";

export async function signIn(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const supabase = await createUserClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error) redirect("/admin/login?error=invalid");
  if (data.user) await ensureAdminMembership(data.user);
  redirect("/admin");
}

export async function signOut() {
  const supabase = await createUserClient();
  await supabase.auth.signOut();
  redirect("/admin/login");
}
