export const VENUE_KNOWLEDGE_CATEGORIES = [
  "general",
  "hours",
  "events",
  "menu",
  "pricing",
  "policies",
] as const;

export type VenueKnowledgeCategory =
  (typeof VENUE_KNOWLEDGE_CATEGORIES)[number];
export type VenueKnowledgeStatus = "draft" | "published" | "inactive";

export type VenueKnowledgeUpdate = {
  id: string;
  category: VenueKnowledgeCategory;
  title: string;
  content: string;
  effectiveFrom: string | null;
  effectiveUntil: string | null;
  status: VenueKnowledgeStatus;
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
  inactiveAt: string | null;
  updatedBy: string | null;
};

export const VENUE_KNOWLEDGE_CATEGORY_LABELS: Record<
  VenueKnowledgeCategory,
  string
> = {
  general: "General update",
  hours: "Opening hours",
  events: "Event or promotion",
  menu: "Food and drinks",
  pricing: "Price or offer",
  policies: "Guest policy",
};

export function readVenueKnowledgeUpdates(
  venueFacts: unknown,
): VenueKnowledgeUpdate[] {
  const root = asRecord(venueFacts);
  const values = Array.isArray(root.knowledgeUpdates)
    ? root.knowledgeUpdates
    : [];

  return values
    .map(readUpdate)
    .filter((item): item is VenueKnowledgeUpdate => Boolean(item))
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
}

export function readActiveVenueKnowledge(
  venueFacts: unknown,
  now = new Date(),
) {
  const nowMs = now.getTime();
  return readVenueKnowledgeUpdates(venueFacts)
    .filter((item) => {
      if (item.status !== "published") return false;
      const from = item.effectiveFrom
        ? new Date(item.effectiveFrom).getTime()
        : null;
      const until = item.effectiveUntil
        ? new Date(item.effectiveUntil).getTime()
        : null;
      return (
        (from === null || from <= nowMs) && (until === null || until > nowMs)
      );
    })
    .slice(0, 24);
}

export function formatActiveVenueKnowledge(
  updates: VenueKnowledgeUpdate[] | null | undefined,
) {
  if (!updates?.length) return "";
  return updates
    .map((item) => {
      const timing = [
        item.effectiveFrom ? `Starts: ${item.effectiveFrom}` : null,
        item.effectiveUntil ? `Ends: ${item.effectiveUntil}` : null,
      ]
        .filter(Boolean)
        .join("; ");
      return `[${VENUE_KNOWLEDGE_CATEGORY_LABELS[item.category]}: ${item.title}]${timing ? `\n${timing}` : ""}\n${item.content}`;
    })
    .join("\n\n");
}

export function getVenueKnowledgeDisplayStatus(
  item: VenueKnowledgeUpdate,
  now = new Date(),
): "draft" | "active" | "scheduled" | "expired" | "inactive" {
  if (item.status === "draft") return "draft";
  if (item.status === "inactive") return "inactive";
  if (item.effectiveFrom && new Date(item.effectiveFrom) > now)
    return "scheduled";
  if (item.effectiveUntil && new Date(item.effectiveUntil) <= now)
    return "expired";
  return "active";
}

function readUpdate(value: unknown): VenueKnowledgeUpdate | null {
  const item = asRecord(value);
  const category = readEnum(item.category, VENUE_KNOWLEDGE_CATEGORIES);
  const status = readEnum(item.status, ["draft", "published", "inactive"]);
  const id = readText(item.id, 80);
  const title = readText(item.title, 120);
  const content = readText(item.content, 2000);
  const createdAt = readIso(item.createdAt);
  const updatedAt = readIso(item.updatedAt);
  if (
    !id ||
    !title ||
    !content ||
    !category ||
    !status ||
    !createdAt ||
    !updatedAt
  )
    return null;

  return {
    id,
    category,
    title,
    content,
    effectiveFrom: readIso(item.effectiveFrom),
    effectiveUntil: readIso(item.effectiveUntil),
    status,
    createdAt,
    updatedAt,
    publishedAt: readIso(item.publishedAt),
    inactiveAt: readIso(item.inactiveAt),
    updatedBy: readNullableText(item.updatedBy, 100),
  };
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function readText(value: unknown, maximum: number) {
  return typeof value === "string" ? value.trim().slice(0, maximum) : "";
}

function readNullableText(value: unknown, maximum: number) {
  return readText(value, maximum) || null;
}

function readIso(value: unknown) {
  if (typeof value !== "string" || !value.trim()) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function readEnum<const T extends readonly string[]>(
  value: unknown,
  values: T,
) {
  return typeof value === "string" && values.includes(value)
    ? (value as T[number])
    : null;
}
