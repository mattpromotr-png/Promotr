"use client";

import { ChevronDown } from "lucide-react";
import { useLayoutEffect, useRef, useState } from "react";

export function ConversationTranscript({
  conversationId,
  lastMessageId,
  children,
}: {
  conversationId: string;
  lastMessageId: string | null;
  children: React.ReactNode;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const previousConversation = useRef<string | null>(null);
  const stickToBottom = useRef(true);
  const [showLatest, setShowLatest] = useState(false);

  useLayoutEffect(() => {
    const element = scrollRef.current;
    if (!element) return;
    const changedConversation = previousConversation.current !== conversationId;
    previousConversation.current = conversationId;
    if (changedConversation || stickToBottom.current) {
      element.scrollTop = element.scrollHeight;
      stickToBottom.current = true;
    }
  }, [conversationId, lastMessageId]);

  function updateScrollPosition() {
    const element = scrollRef.current;
    if (!element) return;
    const nearBottom =
      element.scrollHeight - element.scrollTop - element.clientHeight < 80;
    stickToBottom.current = nearBottom;
    setShowLatest(!nearBottom);
  }

  function jumpToLatest() {
    const element = scrollRef.current;
    if (!element) return;
    element.scrollTop = element.scrollHeight;
    stickToBottom.current = true;
    setShowLatest(false);
  }

  return (
    <div className="relative min-h-0 flex-1">
      <div
        ref={scrollRef}
        onScroll={updateScrollPosition}
        className="bg-elevated/35 h-full space-y-3 overflow-y-auto overscroll-contain p-5 sm:p-6"
        aria-label="Conversation messages"
      >
        {children}
      </div>
      {showLatest && (
        <button
          type="button"
          onClick={jumpToLatest}
          className="focus-ring border-border bg-surface text-foreground absolute right-5 bottom-4 inline-flex items-center gap-1 rounded-full border px-3 py-2 text-xs shadow-lg"
        >
          <ChevronDown size={14} /> Latest messages
        </button>
      )}
    </div>
  );
}
