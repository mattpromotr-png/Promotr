"use server";

import { refresh, revalidatePath } from "next/cache";

import { requireAdmin } from "@/lib/auth/admin";
import { createAdminClient } from "@/lib/supabase/admin";

export async function resolveFollowUp(formData: FormData) {
  await requireAdmin();
  const conversationId = String(formData.get("conversationId") ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(conversationId)) return;

  const { error } = await createAdminClient()
    .from("conversations")
    .update({ status: "closed", updated_at: new Date().toISOString() })
    .eq("id", conversationId)
    .eq("status", "handoff_required");
  if (error) throw new Error("Unable to resolve this follow-up.");

  revalidatePath("/admin");
  revalidatePath("/admin/follow-ups");
  revalidatePath("/admin/leads");
  refresh();
}
