"use client";

import { useFormStatus } from "react-dom";

import { updateLeadStatus } from "@/app/admin/leads/actions";
import type { LeadStatus } from "@/lib/admin/types";

const statuses: LeadStatus[] = ["new", "contacted", "pending", "booked"];

function SaveButton({ compact = false }: { compact?: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      className={`focus-ring bg-brand-gradient rounded-xl font-semibold text-white disabled:cursor-wait disabled:opacity-60 ${compact ? "min-h-9 px-2.5 text-xs" : "min-h-10 px-3 text-sm"}`}
      type="submit"
      disabled={pending}
    >
      {pending ? "Saving…" : "Save"}
    </button>
  );
}

export function LeadStatusForm({
  leadId,
  status,
  compact = false,
}: {
  leadId: string;
  status: LeadStatus;
  compact?: boolean;
}) {
  return (
    <form action={updateLeadStatus} className="flex items-end gap-2">
      <input type="hidden" name="leadId" value={leadId} />
      <label className="text-muted min-w-0 flex-1 text-xs font-medium tracking-wider uppercase">
        <span className={compact ? "sr-only" : undefined}>Status</span>
        <select
          name="status"
          defaultValue={status}
          aria-label={compact ? "Inquiry status" : undefined}
          className={`focus-ring border-border bg-elevated text-foreground w-full rounded-xl border capitalize ${compact ? "min-h-9 px-2 text-xs" : "mt-2 min-h-10 px-3 text-sm"}`}
        >
          {statuses.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
      </label>
      <SaveButton compact={compact} />
    </form>
  );
}
