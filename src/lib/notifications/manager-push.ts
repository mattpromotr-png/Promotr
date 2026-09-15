import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

type PushInput = {
  venueId: string;
  conversationId: string;
  channel: "sms" | "instagram";
  title: string;
  body: string;
  kind: "new_message" | "follow_up";
};

export async function notifyVenueManagers(input: PushInput) {
  const admin = createAdminClient();
  const devices = await admin
    .from("manager_devices")
    .select(
      "id,expo_push_token,staff_memberships!inner(venue_id,active)",
    )
    .eq("notifications_enabled", true)
    .eq("staff_memberships.venue_id", input.venueId)
    .eq("staff_memberships.active", true);
  if (devices.error || !devices.data?.length) return;

  const response = await fetch("https://exp.host/--/api/v2/push/send", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(
      devices.data.map((device) => ({
        to: device.expo_push_token,
        sound: "default",
        priority: "high",
        channelId: "guest-messages",
        title: input.title,
        body: input.body.slice(0, 180),
        data: {
          conversationId: input.conversationId,
          channel: input.channel,
          kind: input.kind,
        },
      })),
    ),
  });
  if (!response.ok) throw new Error("Expo rejected the push request.");
  const payload = (await response.json()) as {
    data?: Array<{ status?: string; details?: { error?: string } }>;
  };
  const invalidIds = devices.data
    .filter(
      (_, index) =>
        payload.data?.[index]?.details?.error === "DeviceNotRegistered",
    )
    .map((device) => device.id);
  if (invalidIds.length)
    await admin
      .from("manager_devices")
      .update({
        notifications_enabled: false,
        updated_at: new Date().toISOString(),
      })
      .in("id", invalidIds);
}
