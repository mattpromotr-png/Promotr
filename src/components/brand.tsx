import { Sparkles } from "lucide-react";

import { cn } from "@/lib/utils";

export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-3" aria-label="Promotr">
      <span className="bg-brand-gradient shadow-violet grid size-9 place-items-center rounded-xl text-white">
        <Sparkles size={18} aria-hidden="true" />
      </span>
      <span>
        <span className="text-foreground block text-sm font-semibold tracking-[0.34em]">
          PROMOTR
        </span>
        <span
          className={cn(
            "text-violet block text-[0.62rem] font-medium tracking-[0.16em]",
            compact && "sr-only",
          )}
        >
          AI CONCIERGE FOR NIGHTLIFE
        </span>
      </span>
    </div>
  );
}
