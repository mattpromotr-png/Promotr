"use client";

import { Bot, ChevronDown, MessageCircle, Send, UserRound } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { sendConversationReply } from "@/app/admin/conversations/actions";
import type { AdminLead } from "@/lib/admin/types";

type Conversation = NonNullable<AdminLead["conversations"]>;

export function BookingConversation({
  conversation,
}: {
  conversation: AdminLead["conversations"];
}) {
  const [expanded, setExpanded] = useState(false);
  const [messages, setMessages] = useState(conversation?.messages ?? []);
  const [loaded, setLoaded] = useState(Boolean(conversation?.messages));
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(false);

  if (!conversation) {
    return (
      <section className="border-border rounded-2xl border p-4">
        <div className="flex items-center gap-3">
          <span className="bg-elevated text-muted grid size-10 place-items-center rounded-xl">
            <MessageCircle size={18} />
          </span>
          <div>
            <h3 className="text-foreground text-sm font-semibold">
              Conversation
            </h3>
            <p className="text-muted mt-1 text-xs">
              No chat conversation is linked to this inquiry.
            </p>
          </div>
        </div>
      </section>
    );
  }
  const activeConversation = conversation;

  const sortedMessages = [...messages]
    .sort((a, b) => a.created_at.localeCompare(b.created_at))
    .slice(-100);

  async function toggleConversation() {
    const nextExpanded = !expanded;
    setExpanded(nextExpanded);
    if (!nextExpanded || loaded || loading) return;
    setLoading(true);
    setLoadError(false);
    try {
      const response = await fetch(
        `/api/admin/conversations/${activeConversation.id}`,
      );
      if (!response.ok) throw new Error("Unable to load messages");
      const body = (await response.json()) as {
        messages: Conversation["messages"];
      };
      setMessages(body.messages ?? []);
      setLoaded(true);
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="border-border overflow-hidden rounded-2xl border">
      <button
        type="button"
        onClick={toggleConversation}
        aria-expanded={expanded}
        className="focus-ring hover:bg-elevated/70 flex min-h-16 w-full items-center justify-between gap-4 px-4 text-left transition-colors"
      >
        <span className="flex items-center gap-3">
          <span className="bg-violet/10 text-violet grid size-10 place-items-center rounded-xl">
            <MessageCircle size={18} />
          </span>
          <span>
            <span className="text-foreground block text-sm font-semibold">
              {expanded ? "Hide conversation" : "View conversation"}
            </span>
            <span className="text-muted mt-1 block text-xs">
              {loaded
                ? `${sortedMessages.length} stored message${sortedMessages.length === 1 ? "" : "s"}`
                : "Load stored messages"}{" "}
              · {activeConversation.channel.replace("_", " ")}
            </span>
          </span>
        </span>
        <ChevronDown
          className={`text-muted transition-transform ${expanded ? "rotate-180" : ""}`}
          size={18}
        />
      </button>
      {expanded && (
        <div className="border-border border-t p-4">
          <div className="border-border bg-elevated max-h-96 space-y-3 overflow-y-auto rounded-2xl border p-4">
            {loading ? (
              <p className="text-muted py-4 text-center text-sm">
                Loading conversation…
              </p>
            ) : loadError ? (
              <p className="py-4 text-center text-sm text-red-300">
                The conversation could not be loaded. Close and try again.
              </p>
            ) : sortedMessages.length ? (
              sortedMessages.map((message) => (
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
                    {message.metadata?.englishTranslation &&
                      message.metadata.englishTranslation !==
                        message.content && (
                        <p className="mt-2 border-t border-current/10 pt-2 text-xs opacity-70">
                          <span className="font-semibold">English:</span>{" "}
                          {message.metadata.englishTranslation}
                        </p>
                      )}
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
          {activeConversation.channel === "web_preview" ||
          activeConversation.channel === "sms" ? (
            <form action={sendConversationReply} className="mt-3 flex gap-2">
              <input
                type="hidden"
                name="conversationId"
                value={activeConversation.id}
              />
              <input
                name="content"
                required
                maxLength={1000}
                placeholder={
                  activeConversation.channel === "sms"
                    ? "Send an SMS as Promotr staff..."
                    : "Reply as Promotr staff..."
                }
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
              <MessageCircle size={17} /> Open Instagram inbox
            </a>
          )}
          {(activeConversation.channel === "web_preview" ||
            activeConversation.channel === "sms") && (
            <p className="text-muted mt-2 text-xs">
              Sending here records a direct staff reply in this conversation.
            </p>
          )}
          <Link
            href={`/admin/conversations?conversation=${activeConversation.id}`}
            className="focus-ring border-border bg-elevated text-foreground mt-3 inline-flex min-h-10 items-center gap-2 rounded-xl border px-4 text-sm"
          >
            <MessageCircle size={16} /> Open full conversation
          </Link>
        </div>
      )}
    </section>
  );
}
