export type PublishedVenueInformation = {
  general: string;
  hours: string;
  events: string;
  menu: string;
  pricing: string;
  policies: string;
  updatedAt: string | null;
};

export const EMPTY_PUBLISHED_VENUE_INFORMATION: PublishedVenueInformation = {
  general: "",
  hours: "",
  events: "",
  menu: "",
  pricing: "",
  policies: "",
  updatedAt: null,
};

export function readPublishedVenueInformation(
  venueFacts: unknown,
): PublishedVenueInformation {
  const root = asRecord(venueFacts);
  const published = asRecord(root.staffPublished);

  return {
    general: readText(published.general),
    hours: readText(published.hours),
    events: readText(published.events),
    menu: readText(published.menu),
    pricing: readText(published.pricing),
    policies: readText(published.policies),
    updatedAt: readNullableText(published.updatedAt),
  };
}

export function formatPublishedVenueInformation(
  information: PublishedVenueInformation | null | undefined,
) {
  if (!information) return "";
  const sections = [
    ["General updates", information.general],
    ["Opening hours", information.hours],
    ["Events and promotions", information.events],
    ["Food and drinks", information.menu],
    ["Prices and offers", information.pricing],
    ["Guest policies", information.policies],
  ].filter((entry) => entry[1].trim());

  if (!sections.length) return "";
  return sections.map(([label, value]) => `[${label}]\n${value}`).join("\n\n");
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function readText(value: unknown) {
  return typeof value === "string" ? value.trim().slice(0, 2000) : "";
}

function readNullableText(value: unknown) {
  const text = readText(value);
  return text || null;
}
