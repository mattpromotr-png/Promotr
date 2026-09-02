"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/admin";
import { createAdminClient } from "@/lib/supabase/admin";

const statuses = new Set(["new", "contacted", "qualified", "closed"]);

export async function updateLeadStatus(formData: FormData) {
  await requireAdmin();
  const leadId = String(formData.get("leadId") ?? "");
  const status = String(formData.get("status") ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(leadId) || !statuses.has(status)) return;
  const { error } = await createAdminClient()
    .from("leads")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", leadId);
  if (error) throw new Error("Unable to update lead status.");
  revalidatePath("/admin");
  revalidatePath("/admin/leads");
}
