import Image from "next/image";

import { cn } from "@/lib/utils";

export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-3" aria-label="Promotr">
      <span className="shadow-violet grid size-10 shrink-0 place-items-center rounded-xl">
        <Image
          src="/images/promotr-mark.png"
          alt=""
          width={40}
          height={40}
          priority
          className="size-10 object-contain"
        />
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
