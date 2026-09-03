"use client";

import { updateConfirmedRevenue } from "@/app/admin/leads/actions";

export function RevenueForm({
  leadId,
  amount,
  enabled,
  disabledReason,
}: {
  leadId: string;
  amount: number | null;
  enabled: boolean;
  disabledReason?: string;
}) {
  return (
    <form
      action={updateConfirmedRevenue}
      className="border-border bg-elevated rounded-2xl border p-4"
    >
      <div className="mb-3">
        <p className="text-foreground text-sm font-semibold">Revenue</p>
        <p className="text-muted mt-1 text-xs">
          Record the final confirmed bottle-service amount for this booking.
        </p>
      </div>
      <label className="text-foreground text-sm font-medium">
        Confirmed bottle-service revenue (CAD)
        <div className="mt-2 flex gap-2">
          <input name="leadId" type="hidden" value={leadId} />
          <input
            name="amount"
            type="number"
            min="0"
            max="1000000"
            step="0.01"
            defaultValue={amount ?? ""}
            required
            placeholder="0.00"
            disabled={!enabled}
            className="focus-ring border-border bg-surface text-foreground min-h-10 min-w-0 flex-1 rounded-xl border px-3 text-sm"
          />
          <button
            type="submit"
            disabled={!enabled}
            className="focus-ring bg-brand-gradient min-h-10 rounded-xl px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-45"
          >
            Save amount
          </button>
        </div>
      </label>
      <p className="text-muted mt-2 text-xs">
        {enabled
          ? "This amount will appear in the Revenue dashboard."
          : disabledReason ||
            "Revenue can be recorded after this table inquiry is marked Booked."}
      </p>
    </form>
  );
}
