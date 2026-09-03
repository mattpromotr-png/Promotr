"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/admin";
import { createAdminClient } from "@/lib/supabase/admin";

const statuses = new Set(["new", "contacted", "pending", "booked"]);

export async function updateLeadStatus(formData: FormData) {
  await requireAdmin();
  const leadId = String(formData.get("leadId") ?? "");
  const status = String(formData.get("status") ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(leadId) || !statuses.has(status)) return;
  const admin = createAdminClient();
  const { data: current } = await admin
    .from("leads")
    .select("booked_at")
    .eq("id", leadId)
    .single();
  const update = {
    status,
    updated_at: new Date().toISOString(),
    ...(status === "booked" && !current?.booked_at
      ? { booked_at: new Date().toISOString() }
      : {}),
  };
  const { error } = await admin.from("leads").update(update).eq("id", leadId);
  if (error) throw new Error("Unable to update lead status.");
  revalidatePath("/admin");
  revalidatePath("/admin/leads");
}

export async function updateConfirmedRevenue(formData: FormData) {
  await requireAdmin();
  const leadId = String(formData.get("leadId") ?? "");
  const amount = Number(formData.get("amount"));
  if (
    !/^[0-9a-f-]{36}$/i.test(leadId) ||
    !Number.isFinite(amount) ||
    amount < 0 ||
    amount > 1_000_000
  )
    return;
  const { error } = await createAdminClient()
    .from("leads")
    .update({
      confirmed_revenue_cad: amount,
      updated_at: new Date().toISOString(),
    })
    .eq("id", leadId)
    .eq("status", "booked")
    .eq("booking_type", "table");
  if (error) throw new Error("Unable to update confirmed revenue.");
  revalidatePath("/admin");
  revalidatePath("/admin/leads");
  revalidatePath("/admin/revenue");
}
