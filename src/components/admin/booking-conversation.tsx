"use client";

import { Bot, MessageCircle, Send, UserRound } from "lucide-react";
import { sendConversationReply } from "@/app/admin/conversations/actions";
import type { AdminLead } from "@/lib/admin/types";

export function BookingConversation({
  conversation,
}: {
  conversation: NonNullable<AdminLead["conversations"]>;
}) {
  const messages = [...(conversation.messages ?? [])]
    .sort((a, b) => a.created_at.localeCompare(b.created_at))
    .slice(-20);
  return (
    <section>
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-foreground text-sm font-semibold tracking-wide uppercase">
          Conversation
        </h3>
        <span className="text-muted text-xs capitalize">
          {conversation.channel.replace("_", " ")}
        </span>
      </div>
      <div className="border-border bg-elevated mt-3 max-h-72 space-y-3 overflow-y-auto rounded-2xl border p-4">
        {messages.length ? (
          messages.map((message) => (
            <div
              key={message.id}
              className={`flex gap-2 ${message.sender_type === "guest" ? "justify-start" : "justify-end"}`}
            >
              {message.sender_type === "guest" && (
                <UserRound size={16} className="text-muted mt-2 shrink-0" />
              )}
              <div
                className={`max-w-[82%] rounded-2xl px-3 py-2 text-sm leading-6 ${message.sender_type === "guest" ? "bg-surface text-foreground border-border border" : "bg-violet/12 text-foreground"}`}
              >
                {message.content}
                <p className="text-muted mt-1 text-[10px] capitalize">
                  {message.sender_type}
                </p>
              </div>
              {message.sender_type !== "guest" && (
                <Bot size={16} className="text-violet mt-2 shrink-0" />
              )}
            </div>
          ))
        ) : (
          <p className="text-muted py-4 text-center text-sm">
            No messages are stored for this inquiry.
          </p>
        )}
      </div>
      {conversation.channel === "web_preview" ? (
        <form action={sendConversationReply} className="mt-3 flex gap-2">
          <input type="hidden" name="conversationId" value={conversation.id} />
          <input
            name="content"
            required
            maxLength={1000}
            placeholder="Reply as Promotr staff…"
            className="focus-ring border-border bg-elevated text-foreground min-h-11 min-w-0 flex-1 rounded-xl border px-3 text-sm"
          />
          <button
            className="focus-ring bg-brand-gradient grid size-11 place-items-center rounded-xl text-white"
            aria-label="Send reply"
          >
            <Send size={17} />
          </button>
        </form>
      ) : (
        <a
          className="focus-ring border-border bg-elevated text-foreground mt-3 inline-flex min-h-11 items-center gap-2 rounded-xl border px-4 text-sm"
          href="https://business.facebook.com/latest/inbox/instagram"
          target="_blank"
          rel="noreferrer"
        >
          <MessageCircle size={17} />
          Open Instagram inbox
        </a>
      )}
      {conversation.channel === "web_preview" && (
        <p className="text-muted mt-2 text-xs">
          Sending here pauses AI replies so staff can take over safely.
        </p>
      )}
    </section>
  );
}
