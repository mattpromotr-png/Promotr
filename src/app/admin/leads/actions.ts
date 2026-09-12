"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth/admin";
import { sendBookingSmsNotification } from "@/lib/messaging/notifications";
import { createAdminClient } from "@/lib/supabase/admin";

const statuses = new Set(["new", "contacted", "pending", "booked"]);
const bookingTypes = new Set(["guest_list", "table", "unsure"]);

function optional(formData: FormData, name: string, max: number) {
  const value = String(formData.get(name) ?? "").trim();
  return value ? value.slice(0, max) : null;
}

export async function updateLeadDetails(formData: FormData) {
  await requireAdmin();
  const leadId = String(formData.get("leadId") ?? "");
  const name = String(formData.get("name") ?? "")
    .trim()
    .slice(0, 100);
  const email = optional(formData, "email", 320);
  const phone = optional(formData, "phone", 30);
  const instagramHandle = optional(formData, "instagramHandle", 50);
  const requestedDate = String(formData.get("requestedDate") ?? "");
  const partySize = Number(formData.get("partySize"));
  const bookingType = String(formData.get("bookingType") ?? "");
  const bottlePreference = optional(formData, "bottlePreference", 200);
  if (
    !/^[0-9a-f-]{36}$/i.test(leadId) ||
    name.length < 2 ||
    (!email && !phone) ||
    (email && !/^\S+@\S+\.\S+$/.test(email)) ||
    !/^\d{4}-\d{2}-\d{2}$/.test(requestedDate) ||
    !Number.isInteger(partySize) ||
    partySize < 1 ||
    partySize > 100 ||
    !bookingTypes.has(bookingType) ||
    (bookingType === "table" && !bottlePreference)
  )
    redirect(`/admin/leads?lead=${leadId}&error=invalid_details`);

  const admin = createAdminClient();
  const booking = await admin
    .from("table_bookings")
    .select("id")
    .eq("lead_id", leadId)
    .maybeSingle();
  if (booking.error) throw new Error("Unable to verify booking details.");

  const update = {
    name,
    email,
    phone,
    instagram_handle: instagramHandle,
    preferred_arrival_time: optional(formData, "preferredArrivalTime", 10),
    occasion: optional(formData, "occasion", 100),
    bottle_preference: bottlePreference,
    notes: optional(formData, "notes", 1000),
    updated_at: new Date().toISOString(),
    ...(!booking.data
      ? {
          requested_date: requestedDate,
          party_size: partySize,
          booking_type: bookingType,
        }
      : {}),
  };
  const { error } = await admin.from("leads").update(update).eq("id", leadId);
  if (error) throw new Error("Unable to update inquiry details.");
  await sendBookingSmsNotification({
    leadId,
    eventType: "admin_updated",
    eventKey: `lead:${leadId}:admin_updated:${Date.now()}`,
  });
  revalidatePath("/admin");
  revalidatePath("/admin/leads");
  redirect(`/admin/leads?lead=${leadId}&saved=details`);
}

export async function deleteLead(formData: FormData) {
  await requireAdmin();
  const leadId = String(formData.get("leadId") ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(leadId)) return;
  const admin = createAdminClient();
  const booking = await admin
    .from("table_bookings")
    .select("id,status,paid_at")
    .eq("lead_id", leadId)
    .maybeSingle();
  if (booking.error) throw new Error("Unable to verify this inquiry.");
  if (
    booking.data?.paid_at ||
    booking.data?.status === "confirmed" ||
    booking.data?.status === "refunded"
  )
    redirect(`/admin/leads?lead=${leadId}&error=payment_protected`);
  if (booking.data) {
    const bookingDelete = await admin
      .from("table_bookings")
      .delete()
      .eq("id", booking.data.id);
    if (bookingDelete.error)
      throw new Error("Unable to remove the unpaid table hold.");
  }
  const { error } = await admin.from("leads").delete().eq("id", leadId);
  if (error) throw new Error("Unable to delete this inquiry.");
  revalidatePath("/admin");
  revalidatePath("/admin/leads");
  revalidatePath("/admin/revenue");
  redirect("/admin/leads?deleted=1");
}

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
  if (status === "booked" && !current?.booked_at)
    await sendBookingSmsNotification({
      leadId,
      eventType: "booking_confirmed",
      eventKey: `lead:${leadId}:booking_confirmed`,
    });
  revalidatePath("/admin");
  revalidatePath("/admin/leads");
}

export async function rescheduleTableBooking(formData: FormData) {
  await requireAdmin();
  const leadId = String(formData.get("leadId") ?? "");
  const bookingId = String(formData.get("bookingId") ?? "");
  const tableId = String(formData.get("tableId") ?? "");
  const bookingDate = String(formData.get("bookingDate") ?? "");
  const partySize = Number(formData.get("partySize"));
  const reason = optional(formData, "reason", 500);
  if (
    !/^[0-9a-f-]{36}$/i.test(leadId) ||
    !/^[0-9a-f-]{36}$/i.test(bookingId) ||
    !/^[0-9a-f-]{36}$/i.test(tableId) ||
    !/^\d{4}-\d{2}-\d{2}$/.test(bookingDate) ||
    !Number.isInteger(partySize) ||
    partySize < 1 ||
    partySize > 100
  )
    redirect(`/admin/leads?lead=${leadId}&error=invalid_details`);
  const { error } = await createAdminClient().rpc("reschedule_table_booking", {
    p_booking_id: bookingId,
    p_table_id: tableId,
    p_booking_date: bookingDate,
    p_party_size: partySize,
    p_changed_by: "admin",
    p_reason: reason,
    p_allow_price_change: true,
  });
  if (error) {
    const code = error.message.includes("table_unavailable")
      ? "table_unavailable"
      : error.message.includes("table_capacity_exceeded")
        ? "table_capacity"
        : "booking_change_failed";
    redirect(`/admin/leads?lead=${leadId}&error=${code}`);
  }
  await sendBookingSmsNotification({
    leadId,
    eventType: "admin_updated",
    eventKey: `booking:${bookingId}:admin_updated:${Date.now()}`,
  });
  revalidatePath("/admin");
  revalidatePath("/admin/leads");
  revalidatePath("/admin/tables");
  redirect(`/admin/leads?lead=${leadId}&saved=booking`);
}

export async function acknowledgeBookingChange(formData: FormData) {
  await requireAdmin();
  const leadId = String(formData.get("leadId") ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(leadId)) return;
  const { error } = await createAdminClient()
    .from("leads")
    .update({
      booking_change_status: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", leadId);
  if (error) throw new Error("Unable to acknowledge booking change.");
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
