"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireAdmin } from "@/lib/auth/admin";
import { createAdminClient } from "@/lib/supabase/admin";

export type VenueInformationState = {
  status: "idle" | "success" | "error";
  message: string;
};

const field = z.string().trim().max(2000);
const venueInformationSchema = z.object({
  general: field,
  hours: field,
  events: field,
  menu: field,
  pricing: field,
  policies: field,
});

export async function publishVenueInformation(
  _previous: VenueInformationState,
  formData: FormData,
): Promise<VenueInformationState> {
  const user = await requireAdmin();
  const parsed = venueInformationSchema.safeParse({
    general: formData.get("general"),
    hours: formData.get("hours"),
    events: formData.get("events"),
    menu: formData.get("menu"),
    pricing: formData.get("pricing"),
    policies: formData.get("policies"),
  });
  if (!parsed.success)
    return {
      status: "error",
      message: "Please shorten the information and try again.",
    };

  const admin = createAdminClient();
  const { data: venue, error: loadError } = await admin
    .from("venues")
    .select("id,venue_facts")
    .eq("slug", "promotr-nightclub")
    .single();
  if (loadError || !venue)
    return { status: "error", message: "Unable to load venue information." };

  const currentFacts = asRecord(venue.venue_facts);
  const { error } = await admin
    .from("venues")
    .update({
      venue_facts: {
        ...currentFacts,
        staffPublished: {
          ...parsed.data,
          updatedAt: new Date().toISOString(),
          updatedBy: user.id,
        },
      },
      updated_at: new Date().toISOString(),
    })
    .eq("id", venue.id);
  if (error)
    return {
      status: "error",
      message: "Venue information could not be published. Please try again.",
    };

  revalidatePath("/admin/settings");
  return {
    status: "success",
    message: "Venue information published. Vera will use it in new replies.",
  };
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}
