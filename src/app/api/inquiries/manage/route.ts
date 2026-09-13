import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { isValidInquiryManageToken } from "@/lib/bookings/manage-token";
import { sendBookingSmsNotification } from "@/lib/messaging/notifications";
import { createAdminClient } from "@/lib/supabase/admin";

const schema = z.object({
  leadId: z.string().uuid(),
  token: z.string().min(32).max(100),
  name: z.string().trim().min(2).max(100),
  email: z.union([z.string().trim().email(), z.literal("")]),
  phone: z.string().trim().max(30),
  requestedDate: z.string().date(),
  partySize: z.coerce.number().int().min(1).max(100),
  preferredArrivalTime: z.string().max(10),
  occasion: z.string().trim().max(100),
  notes: z.string().trim().max(1000),
});

export async function POST(request: NextRequest) {
  const result = schema.safeParse(await request.json().catch(() => null));
  if (!result.success)
    return NextResponse.json(
      { error: "Check the inquiry details and try again." },
      { status: 400 },
    );
  const input = result.data;
  if (!isValidInquiryManageToken(input.leadId, input.token))
    return NextResponse.json(
      { error: "This private inquiry link is invalid." },
      { status: 403 },
    );
  if (new Date(`${input.requestedDate}T23:59:59`) <= new Date())
    return NextResponse.json(
      { error: "Choose a future date." },
      { status: 400 },
    );
  if (!input.email && !input.phone)
    return NextResponse.json(
      { error: "Enter an email address or phone number." },
      { status: 400 },
    );

  const admin = createAdminClient();
  const { data: lead } = await admin
    .from("leads")
    .select("id,booking_type")
    .eq("id", input.leadId)
    .maybeSingle();
  if (!lead || lead.booking_type === "table")
    return NextResponse.json({ error: "Inquiry not found." }, { status: 404 });

  const now = new Date().toISOString();
  const { error } = await admin
    .from("leads")
    .update({
      name: input.name,
      email: input.email || null,
      phone: input.phone || null,
      requested_date: input.requestedDate,
      party_size: input.partySize,
      preferred_arrival_time: input.preferredArrivalTime || null,
      occasion: input.occasion || null,
      notes: input.notes || null,
      booking_change_status: "guest_updated",
      booking_changed_at: now,
      updated_at: now,
    })
    .eq("id", input.leadId);
  if (error)
    return NextResponse.json(
      { error: "Unable to update this inquiry." },
      { status: 500 },
    );

  await sendBookingSmsNotification({
    leadId: input.leadId,
    eventType: "guest_updated",
    eventKey: `lead:${input.leadId}:guest_updated:${Date.now()}`,
  });
  return NextResponse.json({ message: "Your inquiry was updated." });
}
