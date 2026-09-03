"use client";

import { updateConfirmedRevenue } from "@/app/admin/leads/actions";

export function RevenueForm({
  leadId,
  amount,
}: {
  leadId: string;
  amount: number | null;
}) {
  return (
    <form
      action={updateConfirmedRevenue}
      className="border-border bg-elevated rounded-2xl border p-4"
    >
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
            className="focus-ring border-border bg-surface text-foreground min-h-10 min-w-0 flex-1 rounded-xl border px-3 text-sm"
          />
          <button
            type="submit"
            className="focus-ring bg-brand-gradient min-h-10 rounded-xl px-4 text-sm font-semibold text-white"
          >
            Save amount
          </button>
        </div>
      </label>
      <p className="text-muted mt-2 text-xs">
        Only staff-confirmed amounts from booked tables appear in Revenue.
      </p>
    </form>
  );
}
