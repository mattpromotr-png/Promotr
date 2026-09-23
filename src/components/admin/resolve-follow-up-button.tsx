"use client";

import { Check } from "lucide-react";
import { useFormStatus } from "react-dom";

import { resolveFollowUp } from "@/app/admin/follow-ups/actions";

function Button() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="focus-ring bg-brand-gradient inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg px-2.5 text-xs font-semibold text-white disabled:cursor-wait disabled:opacity-60"
    >
      <Check size={14} aria-hidden="true" />
      {pending ? "Resolving…" : "Mark resolved"}
    </button>
  );
}

export function ResolveFollowUpButton({
  conversationId,
}: {
  conversationId: string;
}) {
  return (
    <form action={resolveFollowUp}>
      <input type="hidden" name="conversationId" value={conversationId} />
      <Button />
    </form>
  );
}
