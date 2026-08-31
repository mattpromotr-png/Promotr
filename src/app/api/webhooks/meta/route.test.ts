import { createHmac } from "node:crypto";
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const records = new Map<string, string>();

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: () => ({
      insert: async (value: { provider_message_id: string }) => {
        if (records.has(value.provider_message_id))
          return { error: { code: "23505" } };
        records.set(value.provider_message_id, "received");
        return { error: null };
      },
      select: () => ({
        eq: (_field: string, id: string) => ({
          single: async () => ({ data: { status: records.get(id) } }),
        }),
      }),
      update: (value: { status: string }) => ({
        eq: async (_field: string, id: string) => {
          records.set(id, value.status);
          return { error: null };
        },
      }),
    }),
  }),
}));

import { GET, POST } from "./route";

const secret = "meta-app-secret";
const payload = JSON.stringify({
  entry: [
    {
      time: 123,
      messaging: [
        {
          sender: { id: "guest" },
          recipient: { id: "venue" },
          message: { mid: "m-route-1", text: "Tables Friday?" },
        },
      ],
    },
  ],
});

function request() {
  const signature = createHmac("sha256", secret).update(payload).digest("hex");
  return new NextRequest("http://localhost/api/webhooks/meta", {
    method: "POST",
    body: payload,
    headers: { "x-hub-signature-256": `sha256=${signature}` },
  });
}

describe("Meta webhook route", () => {
  beforeEach(() => {
    records.clear();
    process.env.META_APP_SECRET = secret;
    process.env.META_VERIFY_TOKEN = "verify-me";
    process.env.N8N_INSTAGRAM_WEBHOOK_URL = "https://n8n.example/webhook";
    process.env.N8N_SHARED_SECRET = "x".repeat(32);
    process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000";
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://project.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "service";
    process.env.ADMIN_EMAIL = "owner@example.com";
    process.env.LEAD_RATE_LIMIT_SECRET = "r".repeat(32);
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response(null, { status: 200 })),
    );
  });

  it("returns the raw verification challenge", async () => {
    const response = await GET(
      new NextRequest(
        "http://localhost/api/webhooks/meta?hub.mode=subscribe&hub.verify_token=verify-me&hub.challenge=12345",
      ),
    );
    expect(await response.text()).toBe("12345");
  });

  it("forwards the same provider message only once", async () => {
    expect((await POST(request())).status).toBe(200);
    expect((await POST(request())).status).toBe(200);
    expect(fetch).toHaveBeenCalledTimes(1);
  });
});
