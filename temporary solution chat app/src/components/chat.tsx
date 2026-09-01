"use client";

import { FormEvent, KeyboardEvent, useEffect, useRef, useState } from "react";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  bookingUrl?: string;
};

type ChatResponse = {
  reply?: string;
  bookingUrl?: string | null;
  handoffRequired?: boolean;
};

const STORAGE_KEY = "promotr-ai-host-preview";
const INITIAL_MESSAGE: Message = {
  id: "welcome",
  role: "assistant",
  content:
    "Hey! ✨ I’m the Promotr nightlife host. Ask me about the venue, guest list, or planning a table.",
};
const GENERIC_ERROR =
  "Sorry, I’m having trouble replying right now. Please try again in a moment.";

export function Chat() {
  const [messages, setMessages] = useState<Message[]>([INITIAL_MESSAGE]);
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const stored = JSON.parse(sessionStorage.getItem(STORAGE_KEY) || "[]");
      if (!Array.isArray(stored)) return;
      const safe = stored
        .filter(
          (item): item is Message =>
            item &&
            (item.role === "user" || item.role === "assistant") &&
            typeof item.content === "string" &&
            item.content.trim().length > 0,
        )
        .slice(-12)
        .map((item) => ({
          id: crypto.randomUUID(),
          role: item.role,
          content: item.content.slice(0, 600),
        }));
      if (safe.length) {
        const frame = requestAnimationFrame(() => setMessages(safe));
        return () => cancelAnimationFrame(frame);
      }
    } catch {
      sessionStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  useEffect(() => {
    sessionStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(
        messages.slice(-12).map(({ role, content }) => ({ role, content })),
      ),
    );
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, pending]);

  async function submit(event?: FormEvent) {
    event?.preventDefault();
    const content = draft.trim();
    if (!content || pending) return;

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content,
    };
    const nextMessages = [...messages, userMessage].slice(-12);
    setMessages(nextMessages);
    setDraft("");
    setError("");
    setPending(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: nextMessages.map(({ role, content }) => ({
            role,
            content,
          })),
        }),
      });
      const data = (await response.json()) as ChatResponse;
      if (!response.ok || !data.reply) throw new Error("Chat request failed");
      setMessages((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: data.reply!,
          bookingUrl: data.bookingUrl || undefined,
        },
      ]);
    } catch {
      setError(GENERIC_ERROR);
    } finally {
      setPending(false);
    }
  }

  function restart() {
    sessionStorage.removeItem(STORAGE_KEY);
    setMessages([INITIAL_MESSAGE]);
    setDraft("");
    setError("");
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void submit();
    }
  }

  return (
    <section className="chat-card" aria-label="Promotr AI host preview">
      <header className="chat-header">
        <div className="identity">
          <span className="avatar" aria-hidden="true">
            P
          </span>
          <div>
            <div className="title-row">
              <h1>PROMOTR</h1>
              <span className="badge">Demo</span>
            </div>
            <p className="subtitle">AI Concierge for Nightlife</p>
          </div>
        </div>
        <button className="restart" type="button" onClick={restart}>
          Restart chat
        </button>
      </header>

      <div className="messages" aria-live="polite" aria-busy={pending}>
        {messages.map((message) => (
          <article
            key={message.id}
            className={`message message-${message.role}`}
          >
            {message.content}
            {message.bookingUrl && (
              <a
                className="booking-link"
                href={message.bookingUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                Complete booking inquiry
              </a>
            )}
          </article>
        ))}
        {pending && (
          <div
            className="message message-assistant"
            aria-label="Promotr is replying"
          >
            <span className="typing" aria-hidden="true">
              <span />
              <span />
              <span />
            </span>
          </div>
        )}
        <div ref={endRef} />
      </div>

      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}

      <div>
        <form className="composer" onSubmit={submit}>
          <label className="sr-only" htmlFor="chat-message">
            Message Promotr
          </label>
          <textarea
            id="chat-message"
            value={draft}
            maxLength={600}
            rows={1}
            placeholder="Ask about the venue or plan your night…"
            disabled={pending}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={handleKeyDown}
          />
          <button type="submit" disabled={pending || !draft.trim()}>
            Send
          </button>
        </form>
        <p className="notice">
          Demo chat simulator — live Instagram integration will be connected
          after Meta access is available.
        </p>
      </div>
    </section>
  );
}
