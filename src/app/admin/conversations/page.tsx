import {
  Bot,
  Camera,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Globe2,
  Mail,
  MessageCircle,
  MessageSquareText,
  PauseCircle,
  PlayCircle,
  Smartphone,
  UserRound,
} from "lucide-react";
import Link from "next/link";
import { after } from "next/server";

import { ConversationLiveRefresh } from "@/components/admin/conversation-live-refresh";
import { ConversationComposer } from "@/components/admin/conversation-composer";
import { ConversationTranscript } from "@/components/admin/conversation-transcript";
import { AdminShell } from "@/components/admin/admin-shell";
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
    emailTriage?: { route?: "agent" | "review" | "ignore"; reason?: string };
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
  const channel = ["sms", "instagram", "email"].includes(channelValue || "")
    ? channelValue!
    : "all";
  const view = ["open", "review", "all"].includes(viewValue || "")
    ? viewValue!
    : "open";
  const requestedPage = Number.parseInt(pageValue ?? "1", 10);
  const page =
    Number.isFinite(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  const admin = createAdminClient({ logSlowQueries: true });
  const loadMessages = (conversationId: string) =>
    admin
      .from("messages")
      .select(
        "id,conversation_id,sender_type,content,metadata,created_at,delivery_status",
      )
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: false })
      .limit(200);
  // The selected conversation ID is known from the URL. Start its messages
  // while the list loads; only use them if that ID belongs to the current page.
  const requestedMessages = requested
    ? Promise.resolve(loadMessages(requested)).catch(() => null)
    : null;
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
      ? selectedId === requested && requestedMessages
        ? requestedMessages.then((result) => result ?? loadMessages(selectedId))
        : loadMessages(selectedId)
      : Promise.resolve({ data: [], error: null }),
  ]);
  const unreadCounts = new Map(
    (
      (unreadResult.data ?? []) as Array<{
        conversation_id: string;
        unread_count: number | string;
      }>
    ).map((row) => [row.conversation_id, Number(row.unread_count) || 0]),
  );
  if (messageResult.error)
    throw new Error("Unable to load conversation messages.");
  if (membership.data && selectedId) {
    if ((unreadCounts.get(selectedId) ?? 0) > 0) {
      const membershipId = membership.data.id;
      after(async () => {
        const { error } = await admin.rpc("mark_manager_conversation_read", {
          p_staff_membership_id: membershipId,
          p_conversation_id: selectedId,
        });
        if (error) console.error("Unable to mark admin conversation read");
      });
    }
    unreadCounts.set(selectedId, 0);
  }
  const messages = ((messageResult.data ?? []) as Message[])
    .reverse()
    .filter((message) => !message.metadata?.adminGroupedInto);

  return (
    <AdminShell active="conversations">
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 pb-2">
        <div>
          <p className="eyebrow hidden sm:block">LIVE GUEST SUPPORT</p>
          <h1 className="text-foreground text-xl font-semibold tracking-tight sm:text-2xl">
            Conversations
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <ConversationLiveRefresh />
          {[
            ["all", "All"],
            ["sms", "SMS"],
            ["instagram", "Instagram"],
            ["email", "Email"],
          ].map(([value, label]) => (
            <Link
              key={value}
              href={`/admin/conversations?channel=${value}&view=${view}`}
              className={`focus-ring inline-flex min-h-8 items-center rounded-lg border px-2.5 text-xs font-medium ${channel === value ? "border-violet bg-violet/15 text-foreground" : "border-border bg-elevated text-muted"}`}
            >
              {label}
            </Link>
          ))}
        </div>
      </div>
      <div className="surface-card grid min-h-0 flex-1 grid-rows-[minmax(0,11rem)_minmax(0,1fr)] overflow-hidden lg:grid-cols-[minmax(210px,250px)_minmax(0,1fr)] lg:grid-rows-1 xl:grid-cols-[minmax(210px,250px)_minmax(0,1fr)_minmax(220px,270px)]">
        <aside className="border-border flex min-h-0 flex-col border-b lg:border-r lg:border-b-0">
          <div className="border-border shrink-0 border-b px-3 py-2 lg:px-4 lg:py-4">
            <div className="flex items-baseline justify-between gap-2">
              <h2 className="text-foreground text-sm font-semibold">
                Conversations
              </h2>
              <span className="bg-violet/20 text-violet rounded-full px-2 py-0.5 text-xs font-semibold">
                {total}
              </span>
            </div>
            <p className="text-muted mt-1 hidden text-xs lg:block">
              {conversations.length} on this page
            </p>
            <nav
              className="mt-1 flex gap-1 overflow-x-auto lg:mt-4"
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
                  className={`focus-ring shrink-0 rounded-lg px-2.5 py-1.5 text-xs ${view === value ? "bg-violet/20 text-foreground" : "text-muted hover:bg-elevated hover:text-foreground"}`}
                >
                  {label}
                </Link>
              ))}
            </nav>
          </div>
          <div className="flex min-h-0 flex-1 gap-1 overflow-x-auto p-2 lg:block lg:overflow-x-hidden lg:overflow-y-auto">
            {conversations.length === 0 ? (
              <p className="text-muted p-6 text-sm">No conversations yet.</p>
            ) : (
              conversations.map((item) => {
                const guest = conversationGuestName(item);
                return (
                  <Link
                    key={item.id}
                    href={`/admin/conversations?conversation=${item.id}&page=${page}&channel=${channel}&view=${view}`}
                    aria-current={item.id === selectedId ? "true" : undefined}
                    className={`mb-1 block min-w-44 shrink-0 rounded-xl border px-3 py-2 transition-colors lg:min-w-0 lg:py-3 ${item.id === selectedId ? "border-violet bg-violet/10" : "hover:bg-elevated border-transparent"}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-foreground flex min-w-0 items-center gap-2 truncate text-sm font-medium">
                        <span className="bg-elevated border-border grid size-8 shrink-0 place-items-center rounded-full border text-xs font-semibold">
                          {guest.slice(0, 1).toUpperCase()}
                        </span>
                        <span className="truncate">{guest}</span>
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
                    <p className="text-muted mt-1 flex items-center gap-1.5 pl-10 text-xs capitalize">
                      {item.channel === "instagram" ? (
                        <Camera size={12} aria-hidden="true" />
                      ) : item.channel === "sms" ? (
                        <Smartphone size={12} aria-hidden="true" />
                      ) : item.channel === "email" ? (
                        <Mail size={12} aria-hidden="true" />
                      ) : (
                        <Globe2 size={12} aria-hidden="true" />
                      )}
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
              className="border-border flex shrink-0 items-center justify-between gap-2 border-t px-3 py-1 lg:px-4 lg:py-3"
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

        <section
          id="conversation-chat"
          className="flex min-h-0 min-w-0 flex-col overflow-hidden"
        >
          {!selected ? (
            <div className="text-muted grid flex-1 place-items-center p-8 text-sm">
              Select a conversation.
            </div>
          ) : (
            <>
              <header className="border-border flex items-center gap-3 border-b px-4 py-3 sm:px-5">
                <span className="bg-elevated border-border grid size-10 shrink-0 place-items-center rounded-full border text-sm font-semibold">
                  {conversationGuestName(selected).slice(0, 1).toUpperCase()}
                </span>
                <div className="min-w-0">
                  <h2 className="text-foreground truncate font-semibold">
                    {conversationGuestName(selected)}
                  </h2>
                  <p className="text-muted mt-0.5 flex items-center gap-1 text-xs capitalize">
                    {selected.channel === "instagram" ? (
                      <Camera size={12} aria-hidden="true" />
                    ) : selected.channel === "sms" ? (
                      <Smartphone size={12} aria-hidden="true" />
                    ) : selected.channel === "email" ? (
                      <Mail size={12} aria-hidden="true" />
                    ) : (
                      <Globe2 size={12} aria-hidden="true" />
                    )}
                    {selected.channel.replace("_", " ")} ·{" "}
                    {selected.human_takeover
                      ? "Staff in control"
                      : "Concierge active"}
                  </p>
                </div>
                <Link
                  href="#guest-details"
                  className="focus-ring border-border text-muted ml-auto shrink-0 rounded-lg border px-2.5 py-2 text-xs xl:hidden"
                >
                  Details & controls
                </Link>
              </header>
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
                      {hasTranslatedGuestContent(message) && (
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
                      {selected.channel === "email" &&
                        message.sender_type === "guest" &&
                        message.metadata?.emailTriage?.route === "ignore" && (
                          <p className="mt-2 border-t border-current/15 pt-2 text-xs opacity-75">
                            Vera did not reply:{" "}
                            {message.metadata.emailTriage.reason ||
                              "Not a club inquiry"}
                            .
                          </p>
                        )}
                      {selected.channel === "email" &&
                        message.sender_type === "guest" &&
                        message.metadata?.emailTriage?.route === "review" && (
                          <p className="mt-2 border-t border-current/15 pt-2 text-xs opacity-75">
                            Sent to staff review:{" "}
                            {message.metadata.emailTriage.reason ||
                              "Needs a staff decision"}
                            .
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
                selected.channel === "instagram" ||
                selected.channel === "email") && (
                <div className="shrink-0">
                  <ConversationComposer
                    key={selected.id}
                    conversationId={selected.id}
                    channel={selected.channel}
                  />
                </div>
              )}
            </>
          )}
        </section>
        {selected && (
          <aside
            id="guest-details"
            className="border-border bg-canvas xl:bg-elevated/25 fixed inset-x-2 top-32 bottom-2 z-50 hidden min-w-0 space-y-3 overflow-y-auto rounded-xl border p-3 shadow-2xl target:block lg:inset-x-6 xl:static xl:z-auto xl:block xl:min-h-0 xl:rounded-none xl:border-t-0 xl:border-r-0 xl:border-b-0 xl:border-l xl:shadow-none"
            aria-label="Guest details"
          >
            <div className="mb-3 flex items-center justify-between xl:hidden">
              <h2 className="text-foreground text-sm font-semibold">
                Guest details & controls
              </h2>
              <Link
                href="#conversation-chat"
                className="focus-ring border-border text-foreground rounded-lg border px-3 py-2 text-xs"
              >
                Close
              </Link>
            </div>
            <div className="border-border bg-surface/70 rounded-xl border p-4">
              <h2 className="text-foreground text-sm font-semibold">
                Guest information
              </h2>
              <dl className="mt-4 space-y-3 text-xs">
                <div className="flex justify-between gap-3">
                  <dt className="text-muted">Name</dt>
                  <dd className="text-foreground text-right">
                    {conversationGuestName(selected)}
                  </dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-muted">Channel</dt>
                  <dd className="text-foreground text-right capitalize">
                    {selected.channel.replace("_", " ")}
                  </dd>
                </div>
                {conversationPhone(selected) && (
                  <div className="flex justify-between gap-3">
                    <dt className="text-muted">Phone</dt>
                    <dd className="text-foreground text-right break-all">
                      {conversationPhone(selected)}
                    </dd>
                  </div>
                )}
                {conversationEmail(selected) && (
                  <div className="flex justify-between gap-3">
                    <dt className="text-muted">Email</dt>
                    <dd className="text-foreground text-right break-all">
                      {conversationEmail(selected)}
                    </dd>
                  </div>
                )}
                {selected.contacts?.preferred_language && (
                  <div className="flex justify-between gap-3">
                    <dt className="text-muted">Language</dt>
                    <dd className="text-foreground text-right">
                      {selected.contacts.preferred_language}
                    </dd>
                  </div>
                )}
                <div className="flex justify-between gap-3">
                  <dt className="text-muted">Status</dt>
                  <dd className="text-foreground text-right capitalize">
                    {selected.status.replaceAll("_", " ")}
                  </dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-muted">Last activity</dt>
                  <dd className="text-foreground text-right">
                    {formatMessageTime(selected.last_message_at)}
                  </dd>
                </div>
              </dl>
              {conversationLeads(selected).length > 0 && (
                <div className="border-border mt-4 border-t pt-3">
                  <p className="text-muted mb-2 text-xs">Linked inquiries</p>
                  <div className="flex flex-wrap gap-1.5">
                    {conversationLeads(selected).map((lead) => (
                      <Link
                        key={lead.id}
                        href={`/admin/leads?lead=${lead.id}`}
                        className="focus-ring border-border bg-elevated text-foreground hover:border-violet rounded-lg border px-2 py-1 text-xs"
                      >
                        {lead.name}
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
            {(selected.rolling_summary ||
              (selected.contacts?.memory?.facts?.length ?? 0) > 0) && (
              <div className="border-border bg-surface/70 rounded-xl border p-4">
                <h2 className="text-foreground flex items-center gap-2 text-sm font-semibold">
                  <MessageSquareText
                    size={15}
                    className="text-violet"
                    aria-hidden="true"
                  />
                  Conversation summary
                </h2>
                {selected.rolling_summary && (
                  <p className="text-muted mt-3 text-xs leading-5">
                    {selected.rolling_summary}
                  </p>
                )}
                {(selected.contacts?.memory?.facts?.length ?? 0) > 0 && (
                  <ul className="text-muted mt-3 list-disc space-y-1 pl-4 text-xs leading-5">
                    {selected.contacts?.memory?.facts?.map((fact) => (
                      <li key={fact}>{fact}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}
            <AutomationControls selected={selected} />
            {selected.handoff_reason && (
              <div className="border-border bg-surface/70 rounded-xl border p-4">
                <h2 className="text-foreground text-sm font-semibold">
                  Needs review
                </h2>
                <p className="text-muted mt-2 text-xs leading-5">
                  {selected.handoff_reason}
                </p>
              </div>
            )}
          </aside>
        )}
      </div>
    </AdminShell>
  );
}

function AutomationControls({ selected }: { selected: Conversation }) {
  return (
    <section
      className="border-border bg-surface/70 rounded-xl border p-4"
      aria-label="Conversation automations"
    >
      <h2 className="text-foreground flex items-center gap-2 text-sm font-semibold">
        <Clock3 size={15} className="text-violet" aria-hidden="true" />
        Automations
      </h2>
      <div className="border-border mt-3 border-t pt-3">
        <p className="text-foreground text-xs font-semibold">AI Initiate</p>
        <p className="text-muted mt-1 text-xs">
          Not enabled · consent setup required
        </p>
      </div>
      <div className="border-border mt-3 border-t pt-3">
        <p className="text-foreground text-xs font-semibold">AI Respond</p>
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
          <input type="hidden" name="conversationId" value={selected.id} />
          <SubmitButton
            pendingLabel="Saving..."
            className="border-border bg-elevated min-h-9 rounded-lg border px-3 text-xs"
          >
            {selected.human_takeover ? (
              <PlayCircle size={14} />
            ) : (
              <PauseCircle size={14} />
            )}
            {selected.human_takeover ? "Enable" : "Pause"}
          </SubmitButton>
        </form>
      </div>
      <div className="border-border mt-3 border-t pt-3">
        <p className="text-foreground text-xs font-semibold">AI Follow Up</p>
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
          <details id="follow-up-settings" className="mt-3">
            <summary className="focus-ring text-violet cursor-pointer rounded-lg text-xs font-medium">
              Follow-up settings · {selected.follow_up_enabled ? "On" : "Off"}
              {selected.next_follow_up_at
                ? ` · Next ${formatMessageTime(selected.next_follow_up_at)}`
                : ""}
            </summary>
            <form
              action={updateConversationFollowUp}
              className="mt-3 grid gap-3"
            >
              <input type="hidden" name="conversationId" value={selected.id} />
              <label className="text-muted flex items-start gap-2 text-xs">
                <input
                  type="checkbox"
                  name="enabled"
                  defaultChecked={selected.follow_up_enabled}
                  className="accent-violet mt-0.5 size-4 shrink-0"
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
              <label className="text-muted text-xs">
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
              <p className="text-muted text-xs">
                Sent only to opted-in SMS guests. A guest reply resets the
                timer. Attempts sent: {selected.follow_up_attempts}/
                {selected.follow_up_max_attempts}.
              </p>
              <button className="focus-ring bg-brand-gradient min-h-10 rounded-xl px-4 text-sm font-semibold text-white">
                Save follow-up
              </button>
            </form>
          </details>
        )}
      </div>
    </section>
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
        : conversation.channel === "email"
          ? "Email guest"
          : "Instagram guest")
  );
}

function conversationPhone(conversation: Conversation) {
  return conversation.contacts?.contact_channels.find(
    (contact) => contact.channel === "sms",
  )?.normalized_address;
}

function conversationEmail(conversation: Conversation) {
  return conversation.contacts?.contact_channels.find(
    (contact) => contact.channel === "email",
  )?.normalized_address;
}

function adminEnglishContent(message: Message) {
  return (
    message.metadata?.adminOriginalEnglish ||
    message.metadata?.englishTranslation ||
    message.content
  );
}

function hasTranslatedGuestContent(message: Message) {
  if (message.content === adminEnglishContent(message)) return false;
  const language = message.metadata?.detectedLanguage?.trim().toLowerCase();
  if (!language) return false;
  return !(language.includes("english") || /^en(?:[-_ ]|$)/.test(language));
}

function formatMessageTime(value: string) {
  return new Intl.DateTimeFormat("en-CA", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "America/Toronto",
  }).format(new Date(value));
}
