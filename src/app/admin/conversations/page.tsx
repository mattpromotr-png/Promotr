import {
  Bot,
  ChevronLeft,
  ChevronRight,
  MessageCircle,
  PauseCircle,
  PlayCircle,
  UserRound,
} from "lucide-react";
import Link from "next/link";

import { ConversationLiveRefresh } from "@/components/admin/conversation-live-refresh";
import { ConversationComposer } from "@/components/admin/conversation-composer";
import { ConversationTranscript } from "@/components/admin/conversation-transcript";
import { AdminShell } from "@/components/admin/admin-shell";
import { PageHeading } from "@/components/admin/page-heading";
import { SubmitButton } from "@/components/admin/submit-button";
import { requireAdmin } from "@/lib/auth/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  pauseConversationAutomation,
  resumeConversationAutomation,
  updateConversationFollowUp,
} from "./actions";

export const metadata = { title: "Conversations" };
export const dynamic = "force-dynamic";
const PAGE_SIZE = 30;

type Conversation = {
  id: string;
  channel: string;
  status: string;
  human_takeover: boolean;
  handoff_reason: string | null;
  rolling_summary: string | null;
  last_message_at: string;
  follow_up_enabled: boolean;
  follow_up_delay_minutes: number;
  follow_up_interval_minutes: number;
  follow_up_max_attempts: number;
  follow_up_attempts: number;
  next_follow_up_at: string | null;
  follow_up_message: string | null;
  contacts: {
    display_name: string | null;
    instagram_scoped_id: string;
    preferred_language: string | null;
    memory: { facts?: string[] } | null;
    contact_channels: Array<{
      channel: string;
      normalized_address: string;
    }>;
  } | null;
  lead_conversations: Array<{
    leads: LinkedLead | LinkedLead[] | null;
  }>;
};
type LinkedLead = {
  id: string;
  name: string;
  status: string;
  requested_date: string;
  created_at: string;
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
    adminGroupedInto?: string;
  } | null;
  created_at: string;
  delivery_status: string;
};

export default async function ConversationsPage({
  searchParams,
}: {
  searchParams: Promise<{
    conversation?: string;
    page?: string;
    channel?: string;
    view?: string;
  }>;
}) {
  const user = await requireAdmin();
  const {
    conversation: requested,
    page: pageValue,
    channel: channelValue,
    view: viewValue,
  } = await searchParams;
  const channel = ["sms", "instagram"].includes(channelValue || "")
    ? channelValue!
    : "all";
  const view = ["open", "review", "all"].includes(viewValue || "")
    ? viewValue!
    : "open";
  const requestedPage = Number.parseInt(pageValue ?? "1", 10);
  const page =
    Number.isFinite(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  const admin = createAdminClient();
  const membershipQuery = admin
    .from("staff_memberships")
    .select("id")
    .eq("user_id", user.id)
    .eq("active", true)
    .limit(1)
    .maybeSingle();
  let listQuery = admin
    .from("conversations")
    .select(
      "id,channel,status,human_takeover,handoff_reason,rolling_summary,last_message_at,follow_up_enabled,follow_up_delay_minutes,follow_up_interval_minutes,follow_up_max_attempts,follow_up_attempts,next_follow_up_at,follow_up_message,contacts(display_name,instagram_scoped_id,preferred_language,memory,contact_channels(channel,normalized_address)),lead_conversations(leads(id,name,status,requested_date,created_at))",
      { count: "exact" },
    );
  if (channel !== "all") listQuery = listQuery.eq("channel", channel);
  if (view === "open") listQuery = listQuery.neq("status", "closed");
  if (view === "review") listQuery = listQuery.eq("status", "handoff_required");
  const [membership, listResult] = await Promise.all([
    membershipQuery,
    listQuery
      .order("last_message_at", { ascending: false })
      .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1),
  ]);
  if (listResult.error) throw new Error("Unable to load conversations.");
  const conversations = (listResult.data ?? []) as unknown as Conversation[];
  const total = listResult.count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const selectedId = conversations.some((item) => item.id === requested)
    ? requested
    : conversations[0]?.id;
  const selected = conversations.find((item) => item.id === selectedId);
  const [unreadResult, messageResult] = await Promise.all([
    membership.data
      ? admin.rpc("manager_conversation_unread_counts", {
          p_staff_membership_id: membership.data.id,
        })
      : Promise.resolve({ data: [] }),
    selectedId
      ? admin
          .from("messages")
          .select(
            "id,conversation_id,sender_type,content,metadata,created_at,delivery_status",
          )
          .eq("conversation_id", selectedId)
          .order("created_at", { ascending: false })
          .limit(200)
      : Promise.resolve({ data: [], error: null }),
    membership.data && selectedId
      ? admin.rpc("mark_manager_conversation_read", {
          p_staff_membership_id: membership.data.id,
          p_conversation_id: selectedId,
        })
      : Promise.resolve(),
  ]);
  const unreadCounts = new Map(
    (
      (unreadResult.data ?? []) as Array<{
        conversation_id: string;
        unread_count: number | string;
      }>
    ).map((row) => [row.conversation_id, Number(row.unread_count) || 0]),
  );
  if (membership.data && selectedId) unreadCounts.set(selectedId, 0);
  if (messageResult.error)
    throw new Error("Unable to load conversation messages.");
  const messages = ((messageResult.data ?? []) as Message[])
    .reverse()
    .filter((message) => !message.metadata?.adminGroupedInto);

  return (
    <AdminShell active="conversations">
      <PageHeading
        eyebrow="LIVE GUEST SUPPORT"
        title="Conversations"
        description="Review SMS and Instagram conversations, take over when a guest needs help, and reply from one workspace."
        action={
          <div className="flex flex-wrap items-center gap-2">
            <ConversationLiveRefresh />
            {[
              ["all", "All"],
              ["sms", "SMS"],
              ["instagram", "Instagram"],
            ].map(([value, label]) => (
              <Link
                key={value}
                href={`/admin/conversations?channel=${value}&view=${view}`}
                className={`focus-ring inline-flex min-h-9 items-center rounded-xl border px-3 text-xs font-medium ${channel === value ? "border-violet bg-violet/15 text-foreground" : "border-border bg-elevated text-muted"}`}
              >
                {label}
              </Link>
            ))}
          </div>
        }
      />
      <div className="surface-card mt-4 grid h-[min(820px,calc(100svh-180px))] min-h-[540px] overflow-hidden lg:grid-cols-[310px_1fr]">
        <aside className="border-border flex min-h-0 flex-col border-b lg:border-r lg:border-b-0">
          <div className="border-border border-b px-4 py-3">
            <h2 className="text-foreground font-semibold">
              Recent conversations
            </h2>
            <p className="text-muted mt-1 text-xs">
              {conversations.length} most recent
            </p>
            <nav
              className="mt-3 flex flex-wrap gap-1.5"
              aria-label="Conversation status"
            >
              {[
                ["open", "Open"],
                ["review", "Needs review"],
                ["all", "All"],
              ].map(([value, label]) => (
                <Link
                  key={value}
                  href={`/admin/conversations?view=${value}&channel=${channel}`}
                  aria-current={view === value ? "page" : undefined}
                  className={`focus-ring rounded-lg px-2.5 py-1.5 text-xs ${view === value ? "bg-violet/15 text-foreground" : "bg-elevated text-muted hover:text-foreground"}`}
                >
                  {label}
                </Link>
              ))}
            </nav>
          </div>
          <div className="max-h-72 flex-1 overflow-y-auto lg:max-h-none">
            {conversations.length === 0 ? (
              <p className="text-muted p-6 text-sm">No conversations yet.</p>
            ) : (
              conversations.map((item) => {
                const guest = conversationGuestName(item);
                return (
                  <Link
                    key={item.id}
                    href={`/admin/conversations?conversation=${item.id}&page=${page}&channel=${channel}&view=${view}`}
                    className={`border-border block border-b px-4 py-3 transition-colors ${item.id === selectedId ? "bg-violet/10" : "hover:bg-elevated"}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-foreground truncate text-sm font-medium">
                        {guest}
                      </p>
                      {item.human_takeover ? (
                        <span className="text-violet text-[10px] font-semibold">
                          PAUSED
                        </span>
                      ) : item.status === "handoff_required" ? (
                        <span className="text-[10px] font-semibold text-amber-500">
                          NEEDS REVIEW
                        </span>
                      ) : unreadCounts.get(item.id) ? (
                        <span className="bg-magenta grid min-w-5 place-items-center rounded-full px-1.5 py-0.5 text-[10px] font-bold text-white">
                          {unreadCounts.get(item.id)}
                        </span>
                      ) : null}
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
          {totalPages > 1 && (
            <nav
              className="border-border flex items-center justify-between gap-2 border-t px-4 py-3"
              aria-label="Conversation pages"
            >
              <Link
                href={`/admin/conversations?page=${Math.max(1, page - 1)}&channel=${channel}&view=${view}`}
                aria-disabled={page <= 1}
                className={`focus-ring border-border grid size-9 place-items-center rounded-xl border ${page <= 1 ? "pointer-events-none opacity-40" : "text-foreground"}`}
                aria-label="Previous conversation page"
              >
                <ChevronLeft size={16} />
              </Link>
              <span className="text-muted text-xs">
                {page}/{totalPages} · {total}
              </span>
              <Link
                href={`/admin/conversations?page=${Math.min(totalPages, page + 1)}&channel=${channel}&view=${view}`}
                aria-disabled={page >= totalPages}
                className={`focus-ring border-border grid size-9 place-items-center rounded-xl border ${page >= totalPages ? "pointer-events-none opacity-40" : "text-foreground"}`}
                aria-label="Next conversation page"
              >
                <ChevronRight size={16} />
              </Link>
            </nav>
          )}
        </aside>

        <section className="flex min-h-0 min-w-0 flex-col overflow-hidden">
          {!selected ? (
            <div className="text-muted grid flex-1 place-items-center p-8 text-sm">
              Select a conversation.
            </div>
          ) : (
            <>
              <header className="border-border flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3 sm:px-5">
                <div>
                  <h2 className="text-foreground font-semibold">
                    {conversationGuestName(selected)}
                  </h2>
                  <p className="text-muted mt-1 text-xs capitalize">
                    {selected.channel.replace("_", " ")} ·{" "}
                    {selected.human_takeover
                      ? "Automatic replies paused"
                      : "Concierge active"}
                  </p>
                  {selected.channel === "sms" &&
                    conversationPhone(selected) && (
                      <p className="text-muted mt-1 text-xs">
                        {conversationPhone(selected)} · Primary SMS identity
                      </p>
                    )}
                  {selected.contacts?.preferred_language && (
                    <p className="text-muted mt-1 text-xs">
                      Guest language: {selected.contacts.preferred_language}
                    </p>
                  )}
                  {conversationLeads(selected).length > 0 && (
                    <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs">
                      <span className="text-muted">Linked inquiries:</span>
                      {conversationLeads(selected).map((lead) => (
                        <Link
                          key={lead.id}
                          href={`/admin/leads?lead=${lead.id}`}
                          className="border-border bg-elevated text-foreground rounded-full border px-2 py-1"
                        >
                          {lead.name}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              </header>
              <div className="border-border grid gap-2 border-b p-3 sm:grid-cols-3 sm:p-4">
                <div className="border-border bg-elevated/50 rounded-xl border p-3">
                  <p className="text-foreground text-xs font-semibold">
                    AI Initiate
                  </p>
                  <p className="text-muted mt-1 text-xs">
                    Not enabled · consent setup required
                  </p>
                </div>
                <div className="border-border bg-elevated/50 rounded-xl border p-3">
                  <p className="text-foreground text-xs font-semibold">
                    AI Respond
                  </p>
                  <p className="text-muted mt-1 text-xs">
                    {selected.human_takeover
                      ? "Off · staff in control"
                      : "On · answers incoming messages"}
                  </p>
                  <form
                    action={
                      selected.human_takeover
                        ? resumeConversationAutomation
                        : pauseConversationAutomation
                    }
                    className="mt-2"
                  >
                    <input
                      type="hidden"
                      name="conversationId"
                      value={selected.id}
                    />
                    <SubmitButton
                      pendingLabel="Saving..."
                      className="border-border bg-surface min-h-8 rounded-lg border px-2.5 text-xs"
                    >
                      {selected.human_takeover ? (
                        <PlayCircle size={13} />
                      ) : (
                        <PauseCircle size={13} />
                      )}
                      {selected.human_takeover ? "Enable" : "Pause"}
                    </SubmitButton>
                  </form>
                </div>
                <div className="border-border bg-elevated/50 rounded-xl border p-3">
                  <p className="text-foreground text-xs font-semibold">
                    AI Follow Up
                  </p>
                  <p className="text-muted mt-1 text-xs">
                    {selected.channel === "sms"
                      ? selected.follow_up_enabled
                        ? selected.human_takeover
                          ? "Paused by staff"
                          : "On · scheduled SMS"
                        : "Off · SMS only"
                      : "Not available on this channel"}
                  </p>
                  {selected.channel === "sms" && (
                    <a
                      href="#follow-up-settings"
                      className="focus-ring text-violet mt-2 inline-block text-xs font-medium"
                    >
                      Configure timing
                    </a>
                  )}
                </div>
              </div>
              {(selected.rolling_summary ||
                (selected.contacts?.memory?.facts?.length ?? 0) > 0) && (
                <details className="border-border border-b px-5 py-3 sm:px-6">
                  <summary className="text-foreground cursor-pointer text-sm font-semibold">
                    Remembered guest details
                  </summary>
                  {selected.rolling_summary && (
                    <p className="text-muted mt-3 text-sm leading-6">
                      {selected.rolling_summary}
                    </p>
                  )}
                  {(selected.contacts?.memory?.facts?.length ?? 0) > 0 && (
                    <ul className="text-muted mt-2 list-disc space-y-1 pl-5 text-xs">
                      {selected.contacts?.memory?.facts?.map((fact) => (
                        <li key={fact}>{fact}</li>
                      ))}
                    </ul>
                  )}
                </details>
              )}
              {selected.channel === "sms" && (
                <details
                  id="follow-up-settings"
                  className="border-border border-b px-5 py-3 sm:px-6"
                >
                  <summary className="text-foreground cursor-pointer text-sm font-semibold">
                    Follow-up settings ·{" "}
                    {selected.follow_up_enabled ? "On" : "Off"}
                    {selected.next_follow_up_at
                      ? ` · Next ${formatMessageTime(selected.next_follow_up_at)}`
                      : ""}
                  </summary>
                  <form
                    action={updateConversationFollowUp}
                    className="mt-4 grid gap-3 md:grid-cols-4"
                  >
                    <input
                      type="hidden"
                      name="conversationId"
                      value={selected.id}
                    />
                    <label className="text-muted flex items-center gap-2 text-sm md:col-span-4">
                      <input
                        type="checkbox"
                        name="enabled"
                        defaultChecked={selected.follow_up_enabled}
                        className="accent-violet size-4"
                      />
                      Enable automatic SMS follow-up
                    </label>
                    <label className="text-muted text-xs">
                      First delay
                      <select
                        name="delayMinutes"
                        defaultValue={selected.follow_up_delay_minutes}
                        className="border-border bg-elevated text-foreground mt-1 min-h-10 w-full rounded-xl border px-3"
                      >
                        <option value="60">1 hour</option>
                        <option value="360">6 hours</option>
                        <option value="1440">24 hours</option>
                        <option value="2880">48 hours</option>
                        <option value="10080">7 days</option>
                      </select>
                    </label>
                    <label className="text-muted text-xs">
                      Repeat interval
                      <select
                        name="intervalMinutes"
                        defaultValue={selected.follow_up_interval_minutes}
                        className="border-border bg-elevated text-foreground mt-1 min-h-10 w-full rounded-xl border px-3"
                      >
                        <option value="360">6 hours</option>
                        <option value="1440">24 hours</option>
                        <option value="2880">48 hours</option>
                        <option value="10080">7 days</option>
                      </select>
                    </label>
                    <label className="text-muted text-xs">
                      Maximum messages
                      <select
                        name="maxAttempts"
                        defaultValue={selected.follow_up_max_attempts}
                        className="border-border bg-elevated text-foreground mt-1 min-h-10 w-full rounded-xl border px-3"
                      >
                        {[1, 2, 3, 4, 5].map((attempt) => (
                          <option key={attempt} value={attempt}>
                            {attempt}
                          </option>
                        ))}
                      </select>
                    </label>
                    <button className="focus-ring bg-brand-gradient min-h-10 self-end rounded-xl px-4 text-sm font-semibold text-white">
                      Save follow-up
                    </button>
                    <label className="text-muted text-xs md:col-span-4">
                      Optional message
                      <textarea
                        name="followUpMessage"
                        defaultValue={selected.follow_up_message || ""}
                        maxLength={600}
                        rows={2}
                        placeholder="Hi! Just checking in—do you still need help planning your night? ✨"
                        className="border-border bg-elevated text-foreground mt-1 w-full rounded-xl border px-3 py-2"
                      />
                    </label>
                    <p className="text-muted text-xs md:col-span-4">
                      Sent only to opted-in SMS guests. A guest reply resets the
                      timer. Attempts sent: {selected.follow_up_attempts}/
                      {selected.follow_up_max_attempts}.
                    </p>
                  </form>
                </details>
              )}
              <ConversationTranscript
                conversationId={selected.id}
                lastMessageId={messages.at(-1)?.id ?? null}
              >
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
                        {message.sender_type === "ai"
                          ? "Concierge"
                          : message.sender_type === "human"
                            ? "Staff"
                            : "Guest"}
                      </p>
                      {adminEnglishContent(message)}
                      {message.content !== adminEnglishContent(message) && (
                        <p className="mt-2 border-t border-current/15 pt-2 text-xs opacity-75">
                          <span className="font-semibold">
                            {message.sender_type === "guest"
                              ? "Original"
                              : "Sent to guest"}
                            :
                          </span>{" "}
                          {message.content}
                        </p>
                      )}
                      {message.sender_type !== "guest" && (
                        <p className="mt-1 text-[10px] capitalize opacity-60">
                          {message.delivery_status}
                        </p>
                      )}
                      <time
                        dateTime={message.created_at}
                        className="mt-1 block text-[10px] opacity-55"
                      >
                        {formatMessageTime(message.created_at)}
                      </time>
                    </div>
                  </article>
                ))}
              </ConversationTranscript>
              {(selected.channel === "web_preview" ||
                selected.channel === "sms" ||
                selected.channel === "instagram") && (
                <ConversationComposer
                  key={selected.id}
                  conversationId={selected.id}
                  channel={selected.channel}
                />
              )}
            </>
          )}
        </section>
      </div>
    </AdminShell>
  );
}

function conversationLeads(conversation: Conversation) {
  return (conversation.lead_conversations || [])
    .flatMap((link) => {
      if (!link.leads) return [];
      return Array.isArray(link.leads) ? link.leads : [link.leads];
    })
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
}

function conversationGuestName(conversation: Conversation) {
  return (
    conversationLeads(conversation)[0]?.name ||
    conversation.contacts?.display_name ||
    (conversation.channel === "web_preview"
      ? "Website guest"
      : conversation.channel === "sms"
        ? "SMS guest"
        : "Instagram guest")
  );
}

function conversationPhone(conversation: Conversation) {
  return conversation.contacts?.contact_channels.find(
    (contact) => contact.channel === "sms",
  )?.normalized_address;
}

function adminEnglishContent(message: Message) {
  return (
    message.metadata?.adminOriginalEnglish ||
    message.metadata?.englishTranslation ||
    message.content
  );
}

function formatMessageTime(value: string) {
  return new Intl.DateTimeFormat("en-CA", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "America/Toronto",
  }).format(new Date(value));
}
