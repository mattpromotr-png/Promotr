"use client";

import { useFormStatus } from "react-dom";

import { cn } from "@/lib/utils";

export function SubmitButton({
  children,
  pendingLabel,
  className,
}: {
  children: React.ReactNode;
  pendingLabel: string;
  className?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className={cn(
        "focus-ring inline-flex items-center justify-center gap-2 disabled:opacity-60",
        className,
      )}
    >
      {pending ? pendingLabel : children}
    </button>
  );
}
