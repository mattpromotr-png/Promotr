"use client";

import { MessageCircleMore, Send, Sparkles, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

type ChatMessage = {
  id: string;
  sender: "guest" | "staff" | "vera";
  content: string;
  createdAt: string;
};
type ChatResponse = {
  conversationId: string | null;
  messages: ChatMessage[];
  humanTakeover?: boolean;
  error?: string;
};
const STORAGE_KEY = "promotr_web_chat_conversation";

function MessageText({ content }: { content: string }) {
  const parts = content.split(/(https?:\/\/\S+)/g);
  return (
    <>
      {parts.map((part, index) => {
        if (!/^https?:\/\//.test(part)) return part;
        try {
          const url = new URL(part);
          if (
            url.origin === window.location.origin &&
            (url.pathname === "/book" || url.pathname === "/lost-found")
          )
            return (
              <a
                key={index}
                className="underline underline-offset-2"
                href={url.href}
              >
                {url.pathname === "/book"
                  ? "Open booking inquiry"
                  : "Open lost-item form"}
              </a>
            );
        } catch {
          /* Display unknown text without creating a link. */
        }
        return part;
      })}
    </>
  );
}

export function WebsiteChat() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [humanTakeover, setHumanTakeover] = useState(false);
  const input = useRef<HTMLTextAreaElement>(null);
  const transcript = useRef<HTMLDivElement>(null);
  const pendingRef = useRef(false);

  async function refresh(id: string, quiet = false) {
    try {
      const response = await fetch(
        `/api/web-chat?conversationId=${encodeURIComponent(id)}`,
        { cache: "no-store" },
      );
      if (!response.ok) throw new Error("Unable to refresh chat.");
      const data = (await response.json()) as ChatResponse;
      setMessages(data.messages || []);
      setHumanTakeover(Boolean(data.humanTakeover));
      if (!quiet) setError("");
    } catch {
      if (!quiet) setError("Couldn’t load the conversation. Please try again.");
    }
  }

  function openChat() {
    setOpen(true);
    const id = sessionStorage.getItem(STORAGE_KEY);
    if (id && /^[0-9a-f-]{36}$/i.test(id)) {
      setConversationId(id);
      void refresh(id);
    }
    requestAnimationFrame(() => input.current?.focus());
  }

  useEffect(() => {
    if (!open || !conversationId) return;
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible" && !pendingRef.current)
        void refresh(conversationId, true);
    }, 20_000);
    return () => window.clearInterval(timer);
  }, [open, conversationId]);

  useEffect(() => {
    transcript.current?.scrollTo?.({
      top: transcript.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, pending]);

  async function send() {
    const content = draft.trim();
    if (!content || pending || content.length > 1000) return;
    const messageId = crypto.randomUUID();
    const optimistic: ChatMessage = {
      id: messageId,
      sender: "guest",
      content,
      createdAt: new Date().toISOString(),
    };
    setMessages((current) => [...current, optimistic]);
    setDraft("");
    setError("");
    setPending(true);
    pendingRef.current = true;
    try {
      const response = await fetch("/api/web-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, messageId }),
      });
      const data = (await response.json()) as ChatResponse;
      if (!response.ok)
        throw new Error(data.error || "Message could not be sent.");
      setMessages(data.messages || []);
      setHumanTakeover(Boolean(data.humanTakeover));
      if (data.conversationId) {
        setConversationId(data.conversationId);
        sessionStorage.setItem(STORAGE_KEY, data.conversationId);
      }
    } catch (failure) {
      setMessages((current) =>
        current.filter((message) => message.id !== messageId),
      );
      setDraft(content);
      setError(
        failure instanceof Error
          ? failure.message
          : "Message could not be sent.",
      );
    } finally {
      setPending(false);
      pendingRef.current = false;
      input.current?.focus();
    }
  }

  return (
    <div className="fixed right-4 bottom-4 z-50 sm:right-6 sm:bottom-6">
      {open && (
        <section
          id="promotr-website-chat"
          role="dialog"
          aria-label="Chat with Vera"
          onKeyDown={(event) => {
            if (event.key === "Escape") setOpen(false);
          }}
          className="mb-3 flex h-[min(34rem,calc(100dvh-6.5rem))] w-[min(24rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl border border-white/15 bg-[#101018] text-white shadow-[0_20px_70px_rgba(0,0,0,.55)]"
        >
          <header className="flex items-center justify-between border-b border-white/10 bg-[#181322] px-4 py-3">
            <div className="flex items-center gap-2">
              <Sparkles
                size={18}
                className="text-violet-300"
                aria-hidden="true"
              />
              <div>
                <h2 className="text-sm font-semibold">Ask Vera</h2>
                <p className="text-xs text-white/60">Promotr’s AI concierge</p>
              </div>
            </div>
            <button
              aria-label="Close chat"
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-lg p-2 hover:bg-white/10"
            >
              <X size={18} />
            </button>
          </header>
          <div
            ref={transcript}
            role="log"
            aria-label="Chat messages"
            aria-live="polite"
            className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4"
          >
            {messages.length === 0 && (
              <div className="rounded-xl bg-white/5 p-4 text-sm text-white/85">
                Hi! I’m Vera. Ask me about the club, opening hours, or booking a
                night out.
              </div>
            )}
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.sender === "guest" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[88%] rounded-2xl px-3 py-2 text-sm leading-6 break-words whitespace-pre-wrap ${message.sender === "guest" ? "bg-violet-600 text-white" : "bg-[#262635] text-white/90"}`}
                >
                  <span className="mb-0.5 block text-[10px] font-semibold tracking-wide text-white/60">
                    {message.sender === "guest"
                      ? "You"
                      : message.sender === "staff"
                        ? "Promotr staff"
                        : "Vera"}
                  </span>
                  <MessageText content={message.content} />
                </div>
              </div>
            ))}
            {pending && (
              <p className="text-xs text-white/60" role="status">
                Vera is typing…
              </p>
            )}
          </div>
          {humanTakeover && (
            <p className="border-t border-white/10 px-4 py-2 text-xs text-amber-200">
              A staff member may reply here. Keep this chat open or return later
              on this device.
            </p>
          )}
          {error && (
            <p role="alert" className="px-4 py-2 text-xs text-red-300">
              {error}
            </p>
          )}
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void send();
            }}
            className="flex items-end gap-2 border-t border-white/10 p-3"
          >
            <textarea
              ref={input}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  void send();
                }
              }}
              maxLength={1000}
              rows={2}
              aria-label="Your message"
              placeholder="Ask me anything about Promotr…"
              className="max-h-28 min-h-12 flex-1 resize-none rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/45 focus:border-violet-400 focus:outline-none"
            />
            <button
              disabled={pending || !draft.trim()}
              aria-label="Send message"
              className="grid size-12 shrink-0 place-items-center rounded-xl bg-violet-600 text-white disabled:opacity-50"
            >
              <Send size={18} />
            </button>
          </form>
          <p className="px-4 pb-3 text-[11px] leading-4 text-white/55">
            Chats are saved and may be reviewed by staff. Don’t share payment or
            ID details.{" "}
            <Link href="/privacy" className="underline">
              Privacy
            </Link>
          </p>
        </section>
      )}
      <button
        type="button"
        aria-controls="promotr-website-chat"
        aria-expanded={open}
        onClick={() => (open ? setOpen(false) : openChat())}
        className="focus-ring ml-auto flex min-h-13 items-center gap-2 rounded-full bg-violet-600 px-5 py-3 text-sm font-semibold text-white shadow-[0_10px_35px_rgba(139,92,246,.4)] hover:bg-violet-500"
      >
        <MessageCircleMore size={20} aria-hidden="true" />
        {open ? "Close chat" : "Chat with Vera"}
      </button>
    </div>
  );
}
