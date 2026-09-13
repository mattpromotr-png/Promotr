"use client";

import { useState } from "react";
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
  const initialAmount = amount === null ? "" : String(amount);
  const [currentAmount, setCurrentAmount] = useState(initialAmount);
  const changed = currentAmount !== initialAmount;
  return (
    <form
      action={updateConfirmedRevenue}
      className="border-border bg-elevated rounded-xl border p-3"
    >
      <div className="mb-2">
        <p className="text-foreground text-sm font-semibold">Revenue</p>
        <p className="text-muted mt-0.5 text-[11px]">
          Record the final confirmed bottle-service amount for this booking.
        </p>
      </div>
      <label className="text-foreground text-sm font-medium">
        Confirmed bottle-service revenue (CAD)
        <div className="mt-1.5 flex gap-2">
          <input name="leadId" type="hidden" value={leadId} />
          <input
            name="amount"
            type="number"
            min="0"
            max="1000000"
            step="0.01"
            value={currentAmount}
            onChange={(event) => setCurrentAmount(event.target.value)}
            required
            placeholder="0.00"
            disabled={!enabled}
            className="focus-ring border-border bg-surface text-foreground min-h-9 min-w-0 flex-1 rounded-lg border px-3 text-sm"
          />
          {changed && (
            <button
              type="submit"
              disabled={!enabled}
              className="focus-ring bg-brand-gradient min-h-9 rounded-lg px-3 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-45"
            >
              Save amount
            </button>
          )}
        </div>
      </label>
      <p className="text-muted mt-1.5 text-[11px]">
        {enabled
          ? "This amount will appear in the Revenue dashboard."
          : disabledReason ||
            "Revenue can be recorded after this table inquiry is marked Booked."}
      </p>
    </form>
  );
}
