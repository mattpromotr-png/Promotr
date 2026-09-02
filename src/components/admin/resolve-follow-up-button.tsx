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
      className="focus-ring bg-brand-gradient inline-flex min-h-10 items-center justify-center gap-2 rounded-xl px-3.5 text-sm font-semibold text-white disabled:cursor-wait disabled:opacity-60"
    >
      <Check size={16} aria-hidden="true" />
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
