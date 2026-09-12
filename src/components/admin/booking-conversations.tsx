"use client";

import { useState } from "react";
import { BookingConversation } from "@/components/admin/booking-conversation";
import type { AdminConversation } from "@/lib/admin/types";

export function BookingConversations({
  conversations,
}: {
  conversations: AdminConversation[];
}) {
  const [activeId, setActiveId] = useState(conversations[0]?.id || "");
  const active =
    conversations.find((conversation) => conversation.id === activeId) ||
    conversations[0] ||
    null;

  return (
    <section>
      {conversations.length > 1 && (
        <div
          className="mb-3 flex flex-wrap gap-2"
          aria-label="Inquiry conversations"
        >
          {conversations.map((conversation) => (
            <button
              key={conversation.id}
              type="button"
              onClick={() => setActiveId(conversation.id)}
              className={`focus-ring min-h-9 rounded-xl border px-3 text-xs font-semibold tracking-wide uppercase ${conversation.id === active?.id ? "border-violet bg-violet/15 text-foreground" : "border-border bg-elevated text-muted"}`}
            >
              {conversation.channel === "sms"
                ? "SMS"
                : conversation.channel === "instagram"
                  ? "Instagram"
                  : "Website"}
            </button>
          ))}
        </div>
      )}
      <BookingConversation key={active?.id || "empty"} conversation={active} />
    </section>
  );
}
