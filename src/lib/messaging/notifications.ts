import "server-only";

import { createBookingManageToken } from "@/lib/bookings/manage-token";
import {
  sendTwilioSms,
  normalizeSmsPhone,
} from "@/lib/messaging/channels/twilio";
import type { SmsEventType } from "@/lib/messaging/contract";
import { renderBookingSms } from "@/lib/messaging/templates/booking-sms";
import { createAdminClient } from "@/lib/supabase/admin";

type SendBookingSmsInput = {
  leadId: string;
  eventType: SmsEventType;
  eventKey: string;
};

export async function sendBookingSmsNotification(input: SendBookingSmsInput) {
  const admin = createAdminClient();
  const { data: lead, error: leadError } = await admin
    .from("leads")
    .select(
      "id,venue_id,name,phone,requested_date,preferred_arrival_time,consented_at",
    )
    .eq("id", input.leadId)
    .maybeSingle();
  if (leadError || !lead) return { sent: false, reason: "lead_not_found" };

  const phone = lead.phone ? normalizeSmsPhone(lead.phone) : null;
  if (!phone) return { sent: false, reason: "invalid_or_missing_phone" };

  const { data: consent } = await admin
    .from("sms_consents")
    .select("status")
    .eq("phone_e164", phone)
    .maybeSingle();
  if (consent?.status === "opted_out")
    return { sent: false, reason: "opted_out" };

  let { data: identity } = await admin
    .from("contact_channels")
    .select("id,contact_id")
    .eq("venue_id", lead.venue_id)
    .eq("channel", "sms")
    .eq("normalized_address", phone)
    .maybeSingle();

  if (!identity) {
    const legacyIdentity = `sms:${phone}`;
    const { data: contact, error: contactError } = await admin
      .from("contacts")
      .upsert(
        {
          venue_id: lead.venue_id,
          instagram_scoped_id: legacyIdentity,
          display_name: lead.name,
          last_seen_at: new Date().toISOString(),
        },
        { onConflict: "venue_id,instagram_scoped_id" },
      )
      .select("id")
      .single();
    if (contactError || !contact)
      return { sent: false, reason: "contact_failed" };
    const { data: createdIdentity, error: identityError } = await admin
      .from("contact_channels")
      .upsert(
        {
          venue_id: lead.venue_id,
          contact_id: contact.id,
          channel: "sms",
          external_address: phone,
          normalized_address: phone,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "venue_id,channel,normalized_address" },
      )
      .select("id,contact_id")
      .single();
    if (identityError || !createdIdentity)
      return { sent: false, reason: "identity_failed" };
    identity = createdIdentity;
  }

  await admin.from("sms_consents").upsert(
    {
      lead_id: lead.id,
      contact_channel_id: identity.id,
      phone_e164: phone,
      status: "opted_in",
      source: "booking_form",
      consented_at: lead.consented_at,
      opted_out_at: null,
      evidence: { consentTextVersion: "booking-contact-v1" },
      updated_at: new Date().toISOString(),
    },
    { onConflict: "phone_e164", ignoreDuplicates: true },
  );

  const { data: conversation, error: conversationError } = await admin
    .from("conversations")
    .upsert(
      {
        venue_id: lead.venue_id,
        contact_id: identity.contact_id,
        channel: "sms",
        last_message_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "venue_id,contact_id,channel" },
    )
    .select("id")
    .single();
  if (conversationError || !conversation)
    return { sent: false, reason: "conversation_failed" };

  await admin
    .from("lead_conversations")
    .upsert(
      { lead_id: lead.id, conversation_id: conversation.id },
      { onConflict: "lead_id,conversation_id", ignoreDuplicates: true },
    );

  const { data: booking } = await admin
    .from("table_bookings")
    .select("id,booking_date,deposit_cad")
    .eq("lead_id", lead.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const manageUrl = booking
    ? `${process.env.NEXT_PUBLIC_APP_URL}/book/manage/${booking.id}?token=${createBookingManageToken(booking.id)}`
    : null;
  const renderedContent = renderBookingSms({
    eventType: input.eventType,
    guestName: lead.name,
    bookingDate: booking?.booking_date || lead.requested_date,
    arrivalTime: lead.preferred_arrival_time,
    depositCad: booking ? Number(booking.deposit_cad) : null,
    manageUrl,
  });

  const { data: notification, error: notificationError } = await admin
    .from("outbound_notifications")
    .upsert(
      {
        lead_id: lead.id,
        conversation_id: conversation.id,
        channel: "sms",
        event_type: input.eventType,
        event_key: input.eventKey,
        destination: phone,
        rendered_content: renderedContent,
      },
      { onConflict: "event_key", ignoreDuplicates: true },
    )
    .select("id")
    .maybeSingle();
  if (notificationError) return { sent: false, reason: "notification_failed" };
  if (!notification) return { sent: false, reason: "already_processed" };

  const { data: storedMessage, error: messageError } = await admin
    .from("messages")
    .insert({
      conversation_id: conversation.id,
      direction: "outbound",
      sender_type: "human",
      content: renderedContent,
      delivery_status: "pending",
      metadata: {
        automated: true,
        eventType: input.eventType,
        notificationId: notification.id,
      },
    })
    .select("id")
    .single();
  if (messageError || !storedMessage)
    return { sent: false, reason: "message_failed" };
  await admin
    .from("outbound_notifications")
    .update({ message_id: storedMessage.id })
    .eq("id", notification.id);

  try {
    const result = await sendTwilioSms({
      to: phone,
      body: renderedContent,
      statusCallback: `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/twilio/status`,
    });
    if (!result.configured) {
      await markFailed(
        admin,
        notification.id,
        storedMessage.id,
        "not_configured",
      );
      return { sent: false, reason: "not_configured" };
    }
    const status = normalizeDeliveryStatus(result.status);
    await Promise.all([
      admin
        .from("messages")
        .update({ provider_message_id: result.sid, delivery_status: status })
        .eq("id", storedMessage.id),
      admin
        .from("outbound_notifications")
        .update({
          provider_message_id: result.sid,
          status,
          attempts: 1,
          updated_at: new Date().toISOString(),
        })
        .eq("id", notification.id),
    ]);
    return { sent: true, sid: result.sid };
  } catch (error) {
    const message =
      error instanceof Error ? error.message.slice(0, 500) : "send_failed";
    await markFailed(admin, notification.id, storedMessage.id, message);
    return { sent: false, reason: "send_failed" };
  }
}

function normalizeDeliveryStatus(status: string) {
  return ["queued", "sent", "delivered", "undelivered", "failed"].includes(
    status,
  )
    ? status
    : "queued";
}

async function markFailed(
  admin: ReturnType<typeof createAdminClient>,
  notificationId: string,
  messageId: string,
  error: string,
) {
  await Promise.all([
    admin
      .from("messages")
      .update({ delivery_status: "failed" })
      .eq("id", messageId),
    admin
      .from("outbound_notifications")
      .update({
        status: "failed",
        attempts: 1,
        last_error: error,
        updated_at: new Date().toISOString(),
      })
      .eq("id", notificationId),
  ]);
}
