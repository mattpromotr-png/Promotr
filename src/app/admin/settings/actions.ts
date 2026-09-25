"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireAdmin } from "@/lib/auth/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  readVenueKnowledgeUpdates,
  VENUE_KNOWLEDGE_CATEGORIES,
  type VenueKnowledgeStatus,
  type VenueKnowledgeUpdate,
} from "@/lib/venue/knowledge";

export type VenueInformationState = {
  status: "idle" | "success" | "error";
  message: string;
  token?: number;
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

const venueKnowledgeSchema = z.object({
  category: z.enum(VENUE_KNOWLEDGE_CATEGORIES),
  title: z.string().trim().min(2).max(120),
  content: z.string().trim().min(2).max(2000),
  effectiveFrom: z.string().trim().max(40),
  effectiveUntil: z.string().trim().max(40),
});

export async function createVenueKnowledge(
  _previous: VenueInformationState,
  formData: FormData,
): Promise<VenueInformationState> {
  const user = await requireAdmin();
  const parsed = parseVenueKnowledgeForm(formData);
  if (!parsed.success) return parsed.state;
  const requestedStatus =
    formData.get("submitMode") === "publish" ? "published" : "draft";
  const loaded = await loadVenueKnowledge();
  if (!loaded)
    return failure("Unable to load venue knowledge. Please try again.");
  if (loaded.updates.length >= 200)
    return failure("The update history is full. Please contact the developer.");

  const now = new Date().toISOString();
  const update: VenueKnowledgeUpdate = {
    id: crypto.randomUUID(),
    ...parsed.data,
    status: requestedStatus,
    createdAt: now,
    updatedAt: now,
    publishedAt: requestedStatus === "published" ? now : null,
    inactiveAt: null,
    updatedBy: user.id,
  };
  const saved = await saveVenueKnowledge(loaded, [update, ...loaded.updates]);
  if (!saved) return failure("The venue update could not be saved.");

  revalidatePath("/admin/settings");
  return success(
    requestedStatus === "published"
      ? "Update published. Vera can use it immediately."
      : "Draft saved. Vera cannot see it until it is published.",
  );
}

export async function updateVenueKnowledge(
  _previous: VenueInformationState,
  formData: FormData,
): Promise<VenueInformationState> {
  const user = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!z.string().uuid().safeParse(id).success)
    return failure("Invalid venue update.");
  const parsed = parseVenueKnowledgeForm(formData);
  if (!parsed.success) return parsed.state;
  const loaded = await loadVenueKnowledge();
  if (!loaded) return failure("Unable to load venue knowledge.");
  const existing = loaded.updates.find((item) => item.id === id);
  if (!existing) return failure("This venue update no longer exists.");

  const next = loaded.updates.map((item) =>
    item.id === id
      ? {
          ...item,
          ...parsed.data,
          updatedAt: new Date().toISOString(),
          updatedBy: user.id,
        }
      : item,
  );
  if (!(await saveVenueKnowledge(loaded, next)))
    return failure("Changes could not be saved.");
  revalidatePath("/admin/settings");
  return success("Changes saved.");
}

export async function setVenueKnowledgeStatus(formData: FormData) {
  const user = await requireAdmin();
  const id = z.string().uuid().parse(formData.get("id"));
  const status = z
    .enum(["draft", "published", "inactive"])
    .parse(formData.get("status"));
  const loaded = await loadVenueKnowledge();
  if (!loaded) throw new Error("Unable to load venue knowledge.");
  const now = new Date().toISOString();
  let found = false;
  const next = loaded.updates.map((item) => {
    if (item.id !== id) return item;
    found = true;
    return {
      ...item,
      status: status as VenueKnowledgeStatus,
      updatedAt: now,
      updatedBy: user.id,
      publishedAt: status === "published" ? now : item.publishedAt,
      inactiveAt: status === "inactive" ? now : null,
    };
  });
  if (!found) throw new Error("Venue update not found.");
  if (!(await saveVenueKnowledge(loaded, next)))
    throw new Error("Unable to update venue knowledge.");
  revalidatePath("/admin/settings");
}

function parseVenueKnowledgeForm(formData: FormData):
  | {
      success: true;
      data: Pick<
        VenueKnowledgeUpdate,
        "category" | "title" | "content" | "effectiveFrom" | "effectiveUntil"
      >;
    }
  | { success: false; state: VenueInformationState } {
  const parsed = venueKnowledgeSchema.safeParse({
    category: formData.get("category"),
    title: formData.get("title"),
    content: formData.get("content"),
    effectiveFrom: formData.get("effectiveFrom"),
    effectiveUntil: formData.get("effectiveUntil"),
  });
  if (!parsed.success)
    return {
      success: false,
      state: failure("Add a title and confirmed information before saving."),
    };
  const effectiveFrom = torontoLocalToIso(parsed.data.effectiveFrom);
  const effectiveUntil = torontoLocalToIso(parsed.data.effectiveUntil);
  if (
    (parsed.data.effectiveFrom && !effectiveFrom) ||
    (parsed.data.effectiveUntil && !effectiveUntil)
  )
    return {
      success: false,
      state: failure("Enter valid Toronto dates and times."),
    };
  if (
    effectiveFrom &&
    effectiveUntil &&
    new Date(effectiveUntil) <= new Date(effectiveFrom)
  )
    return {
      success: false,
      state: failure("The end time must be later than the start time."),
    };
  return {
    success: true,
    data: {
      category: parsed.data.category,
      title: parsed.data.title,
      content: parsed.data.content,
      effectiveFrom,
      effectiveUntil,
    },
  };
}

type LoadedVenueKnowledge = {
  id: string;
  facts: Record<string, unknown>;
  updates: VenueKnowledgeUpdate[];
};

async function loadVenueKnowledge(): Promise<LoadedVenueKnowledge | null> {
  const { data, error } = await createAdminClient()
    .from("venues")
    .select("id,venue_facts")
    .eq("slug", "promotr-nightclub")
    .single();
  if (error || !data) return null;
  return {
    id: data.id,
    facts: asRecord(data.venue_facts),
    updates: readVenueKnowledgeUpdates(data.venue_facts),
  };
}

async function saveVenueKnowledge(
  loaded: LoadedVenueKnowledge,
  updates: VenueKnowledgeUpdate[],
) {
  const { error } = await createAdminClient()
    .from("venues")
    .update({
      venue_facts: { ...loaded.facts, knowledgeUpdates: updates },
      updated_at: new Date().toISOString(),
    })
    .eq("id", loaded.id);
  return !error;
}

function torontoLocalToIso(value: string) {
  if (!value) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value);
  if (!match) return null;
  const desired = match.slice(1).map(Number);
  const desiredUtc = Date.UTC(
    desired[0]!,
    desired[1]! - 1,
    desired[2]!,
    desired[3]!,
    desired[4]!,
  );
  let guess = desiredUtc;
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Toronto",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const parts = Object.fromEntries(
      formatter
        .formatToParts(new Date(guess))
        .filter((part) => part.type !== "literal")
        .map((part) => [part.type, Number(part.value)]),
    );
    const actualUtc = Date.UTC(
      parts.year,
      parts.month - 1,
      parts.day,
      parts.hour,
      parts.minute,
    );
    guess += desiredUtc - actualUtc;
  }
  const result = new Date(guess);
  return Number.isNaN(result.getTime()) ? null : result.toISOString();
}

function success(message: string): VenueInformationState {
  return { status: "success", message, token: Date.now() };
}

function failure(message: string): VenueInformationState {
  return { status: "error", message, token: Date.now() };
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}
