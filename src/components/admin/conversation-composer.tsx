"use client";

import { Send } from "lucide-react";
import { useActionState, useEffect, useRef } from "react";

import {
  sendConversationReplyWithState,
  type StaffReplyState,
} from "@/app/admin/conversations/actions";

const initialState: StaffReplyState = {
  status: "idle",
  message: "",
  token: 0,
};

export function ConversationComposer({
  conversationId,
  channel,
}: {
  conversationId: string;
  channel: string;
}) {
  const [state, action, pending] = useActionState(
    sendConversationReplyWithState,
    initialState,
  );
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.status === "success") formRef.current?.reset();
  }, [state.status, state.token]);

  return (
    <form
      ref={formRef}
      action={action}
      className="border-border flex gap-3 border-t p-4 sm:p-5"
    >
      <input type="hidden" name="conversationId" value={conversationId} />
      <label className="flex-1">
        <span className="sr-only">Message guest</span>
        <textarea
          name="content"
          required
          maxLength={1000}
          rows={1}
          placeholder={
            channel === "sms"
              ? "Send an SMS as Promotr staff..."
              : "Send a message as Promotr staff..."
          }
          className="focus-ring border-border bg-elevated text-foreground placeholder:text-muted h-12 w-full resize-none rounded-xl border px-4 py-3 text-sm leading-6"
        />
        {state.status !== "idle" && (
          <span
            role={state.status === "error" ? "alert" : "status"}
            className={`mt-1 block text-xs ${state.status === "error" ? "text-red-300" : "text-emerald-400"}`}
          >
            {state.message}
          </span>
        )}
      </label>
      <button
        type="submit"
        disabled={pending}
        className="focus-ring bg-brand-gradient grid size-12 shrink-0 place-items-center self-start rounded-xl text-white disabled:opacity-60"
        aria-label={pending ? "Sending reply" : "Send reply"}
      >
        <Send size={18} />
      </button>
    </form>
  );
}
