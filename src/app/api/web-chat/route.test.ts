import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  from: vi.fn(),
  rpc: vi.fn(),
  agent: vi.fn(),
}));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({ from: mocks.from, rpc: mocks.rpc }),
}));
vi.mock("@/lib/env/server", () => ({
  getServerEnvironment: () => ({
    LEAD_RATE_LIMIT_SECRET: "x".repeat(32),
    NEXT_PUBLIC_APP_URL: "https://promotr.example",
  }),
}));
vi.mock("@/lib/messaging/concierge", () => ({
  generateConciergeReply: mocks.agent,
}));
import { GET, POST } from "./route";

const session = "84a39de2-3a57-40a0-aec1-df9f38d71957";
const messageId = "beabf7a7-e632-4792-805a-6e6d7cb42b35";
const conversationId = "aff7e083-790d-430b-b12c-98efed58d596";
const transcript = {
  humanTakeover: false,
  messages: [
    {
      id: messageId,
      sender_type: "guest",
      content: "Are you open?",
      created_at: "2026-09-28T00:00:00Z",
    },
    {
      id: "50b20558-a4a0-42c1-b60a-36c4e269052a",
      sender_type: "ai",
      content: "Yes!",
      created_at: "2026-09-28T00:00:01Z",
    },
  ],
};

function request(
  body: unknown,
  origin = "https://promotr.example",
  cookie = session,
) {
  return new NextRequest("https://promotr.example/api/web-chat", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      origin,
      ...(cookie ? { cookie: `promotr_web_chat=${cookie}` } : {}),
    },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.rpc.mockImplementation(async (name: string) => {
    if (name === "consume_web_chat_quota") return { data: true, error: null };
    if (name === "prepare_web_preview_message")
      return {
        data: {
          conversationId,
          inboundMessageId: messageId,
          humanTakeover: false,
          recentMessages: [{ direction: "inbound", content: "Are you open?" }],
        },
        error: null,
      };
    if (name === "get_web_preview_messages")
      return { data: transcript, error: null };
    return { error: null };
  });
  mocks.from.mockImplementation((table: string) => {
    if (table === "messages")
      return {
        select: () => ({
          eq: () => ({ maybeSingle: async () => ({ data: null }) }),
        }),
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
    return {
      select: () => ({
        eq: () => ({
          single: async () => ({
            data: {
              rolling_summary: null,
              contact_id: session,
              contacts: null,
            },
          }),
        }),
      }),
      update: () => ({ eq: async () => ({ error: null }) }),
    };
  });
  mocks.agent.mockResolvedValue({
    reply: "Yes!",
    intent: "faq",
    handoffRequired: false,
    handoffReason: null,
    conversationSummary: "Asked about hours",
    detectedLanguage: "English",
    replyEnglish: "Yes!",
  });
});

describe("public website chat", () => {
  it("rejects cross-site or invalid messages without touching the database", async () => {
    expect(
      (
        await POST(
          request({ content: "Hi", messageId }, "https://attacker.example"),
        )
      ).status,
    ).toBe(403);
    expect((await POST(request({ content: "", messageId }))).status).toBe(422);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it("fails closed if the durable quota is unavailable or exhausted", async () => {
    mocks.rpc.mockResolvedValueOnce({
      data: null,
      error: { code: "missing_migration" },
    });
    expect((await POST(request({ content: "Hi", messageId }))).status).toBe(
      503,
    );
    mocks.rpc.mockResolvedValueOnce({ data: false, error: null });
    expect((await POST(request({ content: "Hi", messageId }))).status).toBe(
      429,
    );
    expect(mocks.agent).not.toHaveBeenCalled();
  });
  it("uses shared concierge, persists reply, and sets a private session", async () => {
    const response = await POST(
      request({ content: "Are you open?", messageId }, undefined, ""),
    );
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.conversationId).toBe(conversationId);
    expect(body.messages).toHaveLength(2);
    expect(mocks.agent).toHaveBeenCalledOnce();
    expect(
      mocks.rpc.mock.calls.some(
        ([name]) => name === "complete_web_preview_reply",
      ),
    ).toBe(true);
    expect(response.headers.get("set-cookie")).toContain("HttpOnly");
    expect(response.headers.get("set-cookie")).toContain("SameSite=lax");
  });
  it("provides the lost-item form for a guest who lost something", async () => {
    mocks.rpc.mockImplementation(async (name: string) => {
      if (name === "consume_web_chat_quota") return { data: true, error: null };
      if (name === "prepare_web_preview_message")
        return {
          data: {
            conversationId,
            inboundMessageId: messageId,
            humanTakeover: false,
            recentMessages: [
              { direction: "inbound", content: "I lost my phone" },
            ],
          },
          error: null,
        };
      if (name === "get_web_preview_messages")
        return { data: transcript, error: null };
      return { error: null };
    });
    await POST(request({ content: "I lost my phone", messageId }));
    expect(mocks.rpc).toHaveBeenCalledWith(
      "complete_web_preview_reply",
      expect.objectContaining({
        p_content: expect.stringContaining(
          `https://promotr.example/lost-found?conversation=${conversationId}`,
        ),
      }),
    );
  });
  it("does not let the AI reply during staff takeover", async () => {
    mocks.rpc.mockImplementation(async (name: string) =>
      name === "consume_web_chat_quota"
        ? { data: true, error: null }
        : name === "prepare_web_preview_message"
          ? {
              data: {
                conversationId,
                inboundMessageId: messageId,
                humanTakeover: true,
              },
              error: null,
            }
          : { data: { ...transcript, humanTakeover: true }, error: null },
    );
    const body = await (
      await POST(request({ content: "Help", messageId }))
    ).json();
    expect(body.humanTakeover).toBe(true);
    expect(mocks.agent).not.toHaveBeenCalled();
  });
  it("loads history only for a valid private session", async () => {
    const noSession = new NextRequest(
      `https://promotr.example/api/web-chat?conversationId=${conversationId}`,
    );
    expect((await (await GET(noSession)).json()).messages).toEqual([]);
    expect(mocks.rpc).not.toHaveBeenCalled();
    const withSession = new NextRequest(
      `https://promotr.example/api/web-chat?conversationId=${conversationId}`,
      { headers: { cookie: `promotr_web_chat=${session}` } },
    );
    expect((await (await GET(withSession)).json()).messages).toHaveLength(2);
    expect(mocks.rpc).toHaveBeenCalledWith("get_web_preview_messages", {
      p_conversation_id: conversationId,
      p_session_id: session,
    });
  });
});
