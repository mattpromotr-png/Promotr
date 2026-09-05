import {
  Bot,
  ExternalLink,
  MessageCircle,
  Send,
  UserRound,
} from "lucide-react";
import Link from "next/link";
import { AdminShell } from "@/components/admin/admin-shell";
import { PageHeading } from "@/components/admin/page-heading";
import { requireAdmin } from "@/lib/auth/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { returnConversationToAi, sendConversationReply } from "./actions";

export const metadata = { title: "Conversations" };
export const dynamic = "force-dynamic";

type Conversation = {
  id: string;
  channel: string;
  status: string;
  human_takeover: boolean;
  handoff_reason: string | null;
  last_message_at: string;
  contacts: { display_name: string | null; instagram_scoped_id: string } | null;
};
type Message = {
  id: string;
  conversation_id: string;
  sender_type: "guest" | "ai" | "human";
  content: string;
  metadata: {
    englishTranslation?: string;
    detectedLanguage?: string;
    adminOriginalEnglish?: string;
  } | null;
  created_at: string;
};

export default async function ConversationsPage({
  searchParams,
}: {
  searchParams: Promise<{ conversation?: string }>;
}) {
  await requireAdmin();
  const { conversation: requested } = await searchParams;
  const admin = createAdminClient();
  const listResult = await admin
    .from("conversations")
    .select(
      "id,channel,status,human_takeover,handoff_reason,last_message_at,contacts(display_name,instagram_scoped_id)",
    )
    .order("last_message_at", { ascending: false })
    .limit(40);
  if (listResult.error) throw new Error("Unable to load conversations.");
  const conversations = (listResult.data ?? []) as unknown as Conversation[];
  const selectedId = conversations.some((item) => item.id === requested)
    ? requested
    : conversations[0]?.id;
  const selected = conversations.find((item) => item.id === selectedId);
  const messageResult = selectedId
    ? await admin
        .from("messages")
        .select("id,conversation_id,sender_type,content,metadata,created_at")
        .eq("conversation_id", selectedId)
        .order("created_at", { ascending: true })
        .limit(200)
    : { data: [], error: null };
  if (messageResult.error)
    throw new Error("Unable to load conversation messages.");
  const messages = (messageResult.data ?? []) as Message[];

  return (
    <AdminShell active="conversations">
      <PageHeading
        eyebrow="LIVE GUEST SUPPORT"
        title="Conversations"
        description="Review AI conversations and join website-preview chats when a guest needs a human. Instagram replies will use the same view after Meta messaging is connected."
      />
      <div className="surface-card mt-8 grid min-h-[620px] overflow-hidden lg:grid-cols-[330px_1fr]">
        <aside className="border-border border-b lg:border-r lg:border-b-0">
          <div className="border-border border-b px-5 py-4">
            <h2 className="text-foreground font-semibold">
              Recent conversations
            </h2>
            <p className="text-muted mt-1 text-xs">
              {conversations.length} most recent
            </p>
          </div>
          <div className="max-h-72 overflow-y-auto lg:max-h-[550px]">
            {conversations.length === 0 ? (
              <p className="text-muted p-6 text-sm">No conversations yet.</p>
            ) : (
              conversations.map((item) => {
                const guest =
                  item.contacts?.display_name ||
                  (item.channel === "web_preview"
                    ? "Website guest"
                    : "Instagram guest");
                return (
                  <Link
                    key={item.id}
                    href={`/admin/conversations?conversation=${item.id}`}
                    className={`border-border block border-b px-5 py-4 transition-colors ${item.id === selectedId ? "bg-violet/10" : "hover:bg-elevated"}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-foreground truncate text-sm font-medium">
                        {guest}
                      </p>
                      {item.human_takeover && (
                        <span className="text-violet text-[10px] font-semibold">
                          HUMAN
                        </span>
                      )}
                    </div>
                    <p className="text-muted mt-1 text-xs capitalize">
                      {item.channel.replace("_", " ")} ·{" "}
                      {new Intl.DateTimeFormat("en-CA", {
                        dateStyle: "medium",
                      }).format(new Date(item.last_message_at))}
                    </p>
                  </Link>
                );
              })
            )}
          </div>
        </aside>

        <section className="flex min-w-0 flex-col">
          {!selected ? (
            <div className="text-muted grid flex-1 place-items-center p-8 text-sm">
              Select a conversation.
            </div>
          ) : (
            <>
              <header className="border-border flex flex-wrap items-center justify-between gap-3 border-b px-5 py-4 sm:px-6">
                <div>
                  <h2 className="text-foreground font-semibold">
                    {selected.contacts?.display_name ||
                      (selected.channel === "web_preview"
                        ? "Website guest"
                        : "Instagram guest")}
                  </h2>
                  <p className="text-muted mt-1 text-xs capitalize">
                    {selected.channel.replace("_", " ")} ·{" "}
                    {selected.human_takeover
                      ? "Human takeover active"
                      : "AI handling"}
                  </p>
                </div>
                {selected.channel === "instagram" ? (
                  <a
                    href="https://business.facebook.com/latest/inbox/instagram"
                    target="_blank"
                    rel="noreferrer"
                    className="focus-ring border-border bg-elevated inline-flex min-h-10 items-center gap-2 rounded-xl border px-3 text-sm"
                  >
                    <ExternalLink size={15} />
                    Open Instagram inbox
                  </a>
                ) : selected.human_takeover ? (
                  <form action={returnConversationToAi}>
                    <input
                      type="hidden"
                      name="conversationId"
                      value={selected.id}
                    />
                    <button
                      className="focus-ring border-border bg-elevated inline-flex min-h-10 items-center gap-2 rounded-xl border px-3 text-sm"
                      type="submit"
                    >
                      <Bot size={15} />
                      Return to AI
                    </button>
                  </form>
                ) : null}
              </header>
              <div className="bg-elevated/35 flex-1 space-y-3 overflow-y-auto p-5 sm:p-6">
                {messages.map((message) => (
                  <article
                    key={message.id}
                    className={`flex ${message.sender_type === "guest" ? "justify-start" : "justify-end"}`}
                  >
                    <div
                      className={`max-w-[82%] rounded-2xl px-4 py-3 text-sm leading-6 ${message.sender_type === "guest" ? "border-border bg-surface text-foreground rounded-tl-md border" : message.sender_type === "human" ? "bg-brand-gradient rounded-tr-md text-white" : "bg-violet/12 text-foreground rounded-tr-md"}`}
                    >
                      <p className="mb-1 flex items-center gap-1.5 text-[10px] font-semibold tracking-wide uppercase opacity-70">
                        {message.sender_type === "guest" ? (
                          <UserRound size={11} />
                        ) : message.sender_type === "ai" ? (
                          <Bot size={11} />
                        ) : (
                          <MessageCircle size={11} />
                        )}
                        {message.sender_type}
                      </p>
                      {message.content}
                      {message.metadata?.englishTranslation &&
                        message.metadata.englishTranslation !==
                          message.content && (
                          <p className="mt-2 border-t border-current/10 pt-2 text-xs opacity-75">
                            <span className="font-semibold">English:</span>{" "}
                            {message.metadata.englishTranslation}
                          </p>
                        )}
                      {message.metadata?.adminOriginalEnglish && (
                        <p className="mt-2 border-t border-current/10 pt-2 text-xs opacity-75">
                          <span className="font-semibold">Staff wrote:</span>{" "}
                          {message.metadata.adminOriginalEnglish}
                        </p>
                      )}
                    </div>
                  </article>
                ))}
              </div>
              {selected.channel === "web_preview" && (
                <form
                  action={sendConversationReply}
                  className="border-border flex gap-3 border-t p-4 sm:p-5"
                >
                  <input
                    type="hidden"
                    name="conversationId"
                    value={selected.id}
                  />
                  <label className="flex-1">
                    <span className="sr-only">Message guest</span>
                    <textarea
                      name="content"
                      required
                      maxLength={1000}
                      rows={2}
                      placeholder="Type a reply and take over this conversation…"
                      className="focus-ring border-border bg-elevated text-foreground placeholder:text-muted w-full resize-none rounded-2xl border px-4 py-3 text-sm"
                    />
                  </label>
                  <button
                    type="submit"
                    className="focus-ring bg-brand-gradient grid size-12 shrink-0 place-items-center self-end rounded-xl text-white"
                    aria-label="Send reply"
                  >
                    <Send size={18} />
                  </button>
                </form>
              )}
            </>
          )}
        </section>
      </div>
    </AdminShell>
  );
}
