"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireAdmin } from "@/lib/auth/admin";
import { createAdminClient } from "@/lib/supabase/admin";

const optional = z
  .string()
  .trim()
  .max(1000)
  .transform((value) => value || null);
const foundItemSchema = z.object({
  itemName: z.string().trim().min(2).max(120),
  description: z.string().trim().min(2).max(1000),
  foundDate: z.string().date(),
  approximateFoundTime: optional,
  foundLocation: optional,
  tableNumber: optional,
  internalNotes: optional,
});

export async function addFoundItem(formData: FormData) {
  await requireAdmin();
  const values = foundItemSchema.parse({
    itemName: formData.get("itemName"),
    description: formData.get("description"),
    foundDate: formData.get("foundDate"),
    approximateFoundTime: formData.get("approximateFoundTime"),
    foundLocation: formData.get("foundLocation"),
    tableNumber: formData.get("tableNumber"),
    internalNotes: formData.get("internalNotes"),
  });
  const admin = createAdminClient();
  const { data: venue, error: venueError } = await admin
    .from("venues")
    .select("id")
    .eq("slug", "promotr-nightclub")
    .single();
  if (venueError || !venue) throw new Error("Unable to identify the venue.");
  const { error } = await admin.from("found_items").insert({
    venue_id: venue.id,
    item_name: values.itemName,
    description: values.description,
    found_date: values.foundDate,
    approximate_found_time: values.approximateFoundTime,
    found_location: values.foundLocation,
    table_number: values.tableNumber,
    internal_notes: values.internalNotes,
  });
  if (error) throw new Error("Unable to add the found item.");
  revalidatePath("/admin/lost-found");
}

export async function updateFoundItemStatus(formData: FormData) {
  await requireAdmin();
  const id = z.string().uuid().parse(formData.get("id"));
  const status = z
    .enum(["available", "matched", "claimed", "disposed"])
    .parse(formData.get("status"));
  const { error } = await createAdminClient()
    .from("found_items")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw new Error("Unable to update the found item.");
  revalidatePath("/admin/lost-found");
}

export async function updateLostReportStatus(formData: FormData) {
  await requireAdmin();
  const id = z.string().uuid().parse(formData.get("id"));
  const status = z
    .enum(["open", "reviewing", "matched", "closed"])
    .parse(formData.get("status"));
  const { error } = await createAdminClient()
    .from("lost_found_reports")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw new Error("Unable to update the lost-item report.");
  revalidatePath("/admin/lost-found");
}
