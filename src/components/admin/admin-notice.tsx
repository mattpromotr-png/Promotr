"use client";

import { CheckCircle2, CircleAlert, X } from "lucide-react";
import { useEffect, useState } from "react";

export function AdminNotice({
  message,
  type,
}: {
  message: string;
  type: "success" | "error";
}) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = window.setTimeout(() => setVisible(false), 4000);
    const url = new URL(window.location.href);
    url.searchParams.delete("saved");
    url.searchParams.delete("deleted");
    url.searchParams.delete("error");
    window.history.replaceState(window.history.state, "", url);
    return () => window.clearTimeout(timer);
  }, []);

  if (!visible) return null;
  const Icon = type === "success" ? CheckCircle2 : CircleAlert;
  return (
    <div
      role={type === "error" ? "alert" : "status"}
      className={`fixed top-20 left-4 z-[80] flex w-[calc(100%-2rem)] max-w-sm items-start gap-3 rounded-2xl border p-4 shadow-2xl backdrop-blur-xl sm:left-6 ${
        type === "error"
          ? "border-red-500/30 bg-red-950/95 text-red-100"
          : "border-emerald-400/30 bg-emerald-950/95 text-emerald-100"
      }`}
    >
      <Icon size={19} className="mt-0.5 shrink-0" />
      <p className="min-w-0 flex-1 text-sm leading-5">{message}</p>
      <button
        type="button"
        onClick={() => setVisible(false)}
        className="focus-ring grid size-7 shrink-0 place-items-center rounded-lg text-current/70 hover:bg-white/10"
        aria-label="Dismiss notification"
      >
        <X size={15} />
      </button>
    </div>
  );
}
