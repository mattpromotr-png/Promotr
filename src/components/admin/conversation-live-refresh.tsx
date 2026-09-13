"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

export function ConversationLiveRefresh() {
  const router = useRouter();

  useEffect(() => {
    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, 5000);
    return () => window.clearInterval(interval);
  }, [router]);

  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-emerald-400" title="New messages appear automatically">
      <span className="size-1.5 animate-pulse rounded-full bg-emerald-400" />
      Live updates
    </span>
  );
}
