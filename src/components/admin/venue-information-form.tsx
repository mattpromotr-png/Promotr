"use client";

import { LoaderCircle, Save } from "lucide-react";
import { useActionState } from "react";

import {
  publishVenueInformation,
  type VenueInformationState,
} from "@/app/admin/settings/actions";
import type { PublishedVenueInformation } from "@/lib/venue/published-information";

const initialState: VenueInformationState = { status: "idle", message: "" };

const fields = [
  {
    name: "general",
    label: "General updates",
    help: "Temporary notices or other confirmed information guests should know.",
    placeholder:
      "Example: The main entrance has temporarily moved to King Street.",
  },
  {
    name: "hours",
    label: "Opening hours",
    help: "Add current hours, holiday hours, or confirmed closures.",
    placeholder: "Example: Friday, October 2: open 9 PM-3 AM.",
  },
  {
    name: "events",
    label: "Events and promotions",
    help: "Only add events, performers, or promotions that the venue has confirmed.",
    placeholder: "Example: Saturday: DJ Nova, doors open at 10 PM.",
  },
  {
    name: "menu",
    label: "Food and drinks",
    help: "Add current menu items, bottle options, availability, or changes.",
    placeholder:
      "Example: Late-night pizza and vegetarian sliders are available.",
  },
  {
    name: "pricing",
    label: "Prices and offers",
    help: "Add confirmed cover charges, packages, minimums, or special offers.",
    placeholder: "Example: Friday cover is $25 after 11 PM.",
  },
  {
    name: "policies",
    label: "Guest policies",
    help: "Add confirmed entry, dress-code, reservation, or venue policies.",
    placeholder: "Example: Last entry is at 2 AM. Valid photo ID is required.",
  },
] as const;

export function VenueInformationForm({
  information,
}: {
  information: PublishedVenueInformation;
}) {
  const [state, action, pending] = useActionState(
    publishVenueInformation,
    initialState,
  );

  return (
    <form action={action} className="mt-5">
      <div className="grid gap-4 lg:grid-cols-2">
        {fields.map((field) => (
          <label key={field.name} className="block">
            <span className="text-foreground text-sm font-medium">
              {field.label}
            </span>
            <span className="text-muted mt-1 block text-xs leading-5">
              {field.help}
            </span>
            <textarea
              name={field.name}
              defaultValue={information[field.name]}
              maxLength={2000}
              rows={4}
              placeholder={field.placeholder}
              className="focus-ring border-border bg-elevated text-foreground placeholder:text-muted mt-2 w-full resize-y rounded-xl border px-3 py-2.5 text-sm leading-6"
            />
          </label>
        ))}
      </div>

      <div className="border-border mt-5 flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-h-5">
          {state.message ? (
            <p
              aria-live="polite"
              className={`text-sm ${state.status === "error" ? "text-red-500" : "text-emerald-600 dark:text-emerald-400"}`}
            >
              {state.message}
            </p>
          ) : information.updatedAt ? (
            <p className="text-muted text-xs">
              Last published {formatDate(information.updatedAt)}
            </p>
          ) : (
            <p className="text-muted text-xs">
              No staff updates have been published yet.
            </p>
          )}
        </div>
        <button
          type="submit"
          disabled={pending}
          className="focus-ring bg-brand-gradient inline-flex min-h-10 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold text-white disabled:cursor-wait disabled:opacity-60"
        >
          {pending ? (
            <LoaderCircle
              size={16}
              className="animate-spin"
              aria-hidden="true"
            />
          ) : (
            <Save size={16} aria-hidden="true" />
          )}
          {pending ? "Publishing…" : "Publish updates"}
        </button>
      </div>
    </form>
  );
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "recently";
  return new Intl.DateTimeFormat("en-CA", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "America/Toronto",
  }).format(date);
}
