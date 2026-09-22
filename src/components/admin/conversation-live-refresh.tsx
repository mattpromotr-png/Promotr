"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";

export function ConversationLiveRefresh() {
  const router = useRouter();

  useEffect(() => {
    const supabase = createBrowserSupabaseClient();
    let refreshTimer: number | undefined;
    const refresh = () => {
      window.clearTimeout(refreshTimer);
      refreshTimer = window.setTimeout(() => router.refresh(), 500);
    };
    const channel = supabase
      .channel("admin-conversations-live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "messages" },
        refresh,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "conversations" },
        refresh,
      )
      .subscribe();
    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, 60000);
    return () => {
      window.clearTimeout(refreshTimer);
      window.clearInterval(interval);
      void supabase.removeChannel(channel);
    };
  }, [router]);

  return (
    <span
      className="inline-flex items-center gap-1.5 text-xs text-emerald-400"
      title="New messages appear automatically"
    >
      <span className="size-1.5 animate-pulse rounded-full bg-emerald-400" />
      Live updates
    </span>
  );
}
