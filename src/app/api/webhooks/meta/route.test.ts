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

function request(signatureOverride?: string | null) {
  const signature = createHmac("sha256", secret).update(payload).digest("hex");
  return new NextRequest("http://localhost/api/webhooks/meta", {
    method: "POST",
    body: payload,
    headers:
      signatureOverride === null
        ? {}
        : { "x-hub-signature-256": signatureOverride ?? `sha256=${signature}` },
  });
}

describe("Meta webhook route", () => {
  beforeEach(() => {
    records.clear();
    delete process.env.META_INSTAGRAM_APP_SECRET;
    delete process.env.META_BASIC_APP_SECRET;
    process.env.META_APP_SECRET = secret;
    process.env.META_VERIFY_TOKEN = "verify-me";
    process.env.META_INSTAGRAM_ACCOUNT_ID = "venue";
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

  it("ignores messages for a different Instagram account", async () => {
    process.env.META_INSTAGRAM_ACCOUNT_ID = "another-venue";
    expect((await POST(request())).status).toBe(200);
    expect(fetch).not.toHaveBeenCalled();
    expect(records.size).toBe(0);
  });

  it.each(["META_INSTAGRAM_APP_SECRET", "META_BASIC_APP_SECRET"])(
    "authenticates with explicitly configured %s",
    async (key) => {
      process.env.META_APP_SECRET = "different-legacy-secret";
      process.env[key] = secret;
      expect((await POST(request())).status).toBe(200);
      expect(fetch).toHaveBeenCalledTimes(1);
    },
  );

  it("rejects signatures that match none of the configured app secrets", async () => {
    process.env.META_INSTAGRAM_APP_SECRET = "instagram-secret";
    process.env.META_BASIC_APP_SECRET = "basic-secret";
    expect((await POST(request(`sha256=${"0".repeat(64)}`))).status).toBe(401);
    expect(fetch).not.toHaveBeenCalled();
    expect(records.size).toBe(0);
  });

  it("accepts a signed empty test without database or n8n processing", async () => {
    delete process.env.N8N_INSTAGRAM_WEBHOOK_URL;
    const body = '{"object":"instagram","entry":[]}';
    const signature = createHmac("sha256", secret).update(body).digest("hex");
    const response = await POST(
      new NextRequest("http://localhost/api/webhooks/meta", {
        method: "POST",
        body,
        headers: { "x-hub-signature-256": `sha256=${signature}` },
      }),
    );
    expect(response.status).toBe(200);
    expect(records.size).toBe(0);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("verifies the original bytes before decoding the payload", async () => {
    const rawBody = Buffer.concat([Buffer.from(payload), Buffer.from([0xff])]);
    const signature = createHmac("sha256", secret)
      .update(rawBody)
      .digest("hex");
    const response = await POST(
      new NextRequest("http://localhost/api/webhooks/meta", {
        method: "POST",
        body: rawBody,
        headers: { "x-hub-signature-256": `sha256=${signature}` },
      }),
    );
    expect(response.status).toBe(400);
    expect(fetch).not.toHaveBeenCalled();
  });

  it.each([
    ["missing_app_secret", null, "missing_secret"],
    ["app_secret_has_whitespace", null, "whitespace"],
    ["missing_signature_header", null, "missing_header"],
    ["malformed_signature_header", "sha256=invalid", "malformed"],
    ["signature_mismatch", `sha256=${"0".repeat(64)}`, "mismatch"],
  ])("logs a safe reason for %s", async (reason, header, setup) => {
    if (setup === "missing_secret") delete process.env.META_APP_SECRET;
    if (setup === "whitespace") process.env.META_APP_SECRET = `${secret} `;
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      const response = await POST(
        request(setup === "missing_header" ? null : header),
      );
      expect(response.status).toBe(401);
      expect(log).toHaveBeenCalledWith("Meta webhook authentication rejected", {
        reason,
      });
      expect(fetch).not.toHaveBeenCalled();
    } finally {
      log.mockRestore();
    }
  });
});
