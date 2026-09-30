import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  rpc: vi.fn(),
  from: vi.fn(),
  triage: vi.fn(),
  agent: vi.fn(),
  send: vi.fn(),
  notify: vi.fn(),
}));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({ rpc: mocks.rpc, from: mocks.from }),
}));
vi.mock("@/lib/gmail/email-triage", () => ({
  triageIncomingEmail: mocks.triage,
}));
vi.mock("@/lib/messaging/concierge", () => ({
  generateConciergeReply: mocks.agent,
}));
vi.mock("@/lib/messaging/email-conversation", () => ({
  sendEmailConversationMessage: mocks.send,
}));
vi.mock("@/lib/notifications/manager-push", () => ({
  notifyVenueManagers: mocks.notify,
}));
vi.mock("@/lib/messaging/recall", () => ({
  loadRecallExcerpts: async () => [],
}));

import { processEmailConversation } from "./process-conversation";

const conversationId = "84a39de2-3a57-40a0-aec1-df9f38d71957";
const messageId = "beabf7a7-e632-4792-805a-6e6d7cb42b35";
const message = {
  id: messageId,
  direction: "inbound",
  content: "Can you help me?",
  created_at: "2026-09-30T12:00:00Z",
  metadata: {
    gmail: {
      threadId: "thread-one",
      from: "guest@example.com",
      subject: "Question about Promotr",
    },
  },
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.rpc.mockImplementation(async (name: string) =>
    name === "claim_email_concierge_work"
      ? {
          data: { claimed: true, messageId, createdAt: message.created_at },
          error: null,
        }
      : { error: null },
  );
  mocks.from.mockImplementation((table: string) => {
    if (table === "conversations")
      return {
        select: () => ({
          eq: () => ({
            single: async () => ({
              data: {
                venue_id: "venue-one",
                contact_id: "contact-one",
                rolling_summary: null,
                human_takeover: false,
                contacts: null,
              },
            }),
          }),
        }),
        update: () => ({ eq: async () => ({ error: null }) }),
      };
    if (table === "messages")
      return {
        select: () => ({
          eq: () => ({
            lte: () => ({
              order: () => ({ limit: async () => ({ data: [message] }) }),
            }),
          }),
        }),
        update: () => ({ eq: async () => ({ error: null }) }),
      };
    throw new Error(`Unexpected table: ${table}`);
  });
});

describe("email triage before Vera", () => {
  it("marks unrelated mail processed without generating or sending a reply", async () => {
    mocks.triage.mockResolvedValue({
      route: "ignore",
      reason: "Unrelated mail",
    });
    await processEmailConversation(conversationId);
    expect(mocks.triage).toHaveBeenCalledWith(
      expect.objectContaining({
        sender: "guest@example.com",
        subject: "Question about Promotr",
        body: "Can you help me?",
      }),
    );
    expect(mocks.agent).not.toHaveBeenCalled();
    expect(mocks.send).not.toHaveBeenCalled();
    expect(mocks.notify).not.toHaveBeenCalled();
    expect(mocks.rpc).toHaveBeenCalledWith("finish_email_concierge_work", {
      p_conversation_id: conversationId,
      p_message_id: messageId,
      p_processed: true,
    });
  });

  it("sends uncertain mail to staff and pauses Vera for that conversation", async () => {
    mocks.triage.mockResolvedValue({
      route: "review",
      reason: "Unclear purpose",
    });
    const updates: Record<string, unknown>[] = [];
    mocks.from.mockImplementation((table: string) => {
      if (table === "conversations")
        return {
          select: () => ({
            eq: () => ({
              single: async () => ({
                data: {
                  venue_id: "venue-one",
                  contact_id: "contact-one",
                  human_takeover: false,
                },
              }),
            }),
          }),
          update: (value: Record<string, unknown>) => {
            updates.push(value);
            return { eq: async () => ({ error: null }) };
          },
        };
      return {
        select: () => ({
          eq: () => ({
            lte: () => ({
              order: () => ({ limit: async () => ({ data: [message] }) }),
            }),
          }),
        }),
        update: () => ({ eq: async () => ({ error: null }) }),
      };
    });
    await processEmailConversation(conversationId);
    expect(updates).toContainEqual(
      expect.objectContaining({
        status: "handoff_required",
        handoff_reason: "Unclear purpose",
        human_takeover: true,
      }),
    );
    expect(mocks.notify).toHaveBeenCalledWith(
      expect.objectContaining({ kind: "follow_up" }),
    );
    expect(mocks.agent).not.toHaveBeenCalled();
    expect(mocks.send).not.toHaveBeenCalled();
  });

  it("lets a clear club question reach Vera with only its own email thread", async () => {
    mocks.triage.mockResolvedValue({ route: "agent", reason: "Club inquiry" });
    mocks.agent.mockResolvedValue({
      reply: "Happy to help with Saturday!",
      replyEnglish: "Happy to help with Saturday!",
      latestGuestMessageEnglish: "Can you help me?",
      detectedLanguage: "English",
      guestFirstName: null,
      memoryFacts: [],
      conversationSummary: "Guest asked about Saturday",
      shareBookingForm: false,
      handoffRequired: false,
      handoffReason: null,
    });
    const prior = {
      ...message,
      id: "prior",
      direction: "outbound",
      content: "Friday tables need an inquiry.",
      created_at: "2026-09-30T11:00:00Z",
    };
    const unrelated = {
      ...prior,
      id: "other-thread",
      content: "Unrelated earlier thread",
      metadata: { gmail: { threadId: "thread-two" } },
    };
    mocks.from.mockImplementation((table: string) => {
      if (table === "conversations")
        return {
          select: () => ({
            eq: () => ({
              single: async () => ({
                data: {
                  venue_id: "venue-one",
                  contact_id: "contact-one",
                  human_takeover: false,
                  contacts: null,
                  rolling_summary: null,
                },
              }),
            }),
          }),
          update: () => ({ eq: async () => ({ error: null }) }),
        };
      if (table === "messages")
        return {
          select: () => ({
            eq: () => ({
              lte: () => ({
                order: () => ({
                  limit: async () => ({ data: [message, prior, unrelated] }),
                }),
              }),
              eq: () => ({
                order: () => ({
                  limit: () => ({
                    maybeSingle: async () => ({ data: { id: messageId } }),
                  }),
                }),
              }),
            }),
          }),
          update: () => ({ eq: async () => ({ error: null }) }),
        };
      if (table === "venues")
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({
                data: { venue_facts: {} },
                error: null,
              }),
            }),
          }),
        };
      if (table === "contacts")
        return { update: () => ({ eq: async () => ({ error: null }) }) };
      throw new Error(`Unexpected table: ${table}`);
    });
    await processEmailConversation(conversationId);
    expect(mocks.triage).toHaveBeenCalledWith(
      expect.objectContaining({
        priorThreadMessages: [
          expect.objectContaining({
            content: "Friday tables need an inquiry.",
          }),
        ],
      }),
    );
    expect(mocks.agent).toHaveBeenCalledWith(
      [
        { role: "assistant", content: "Friday tables need an inquiry." },
        { role: "user", content: "Can you help me?" },
      ],
      expect.any(Object),
    );
    expect(mocks.send).toHaveBeenCalledOnce();
  });
});
