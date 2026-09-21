import { beforeEach, describe, expect, it, vi } from "vitest";

import { sendInstagramMessage } from "./instagram";

describe("Instagram channel delivery", () => {
  beforeEach(() => {
    process.env.META_INSTAGRAM_ACCOUNT_ID = "17841440000000000";
    process.env.META_ACCESS_TOKEN = "test-token";
    process.env.META_GRAPH_API_VERSION = "v24.0";
  });

  it("sends from the configured venue account and returns the provider ID", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ message_id: "mid-123" }), {
        status: 200,
      }),
    );
    vi.stubGlobal("fetch", fetchMock);
    await expect(
      sendInstagramMessage({ recipientId: "17841441111111111", text: "Hi!" }),
    ).resolves.toEqual({ messageId: "mid-123" });
    expect(fetchMock).toHaveBeenCalledWith(
      "https://graph.instagram.com/v24.0/17841440000000000/messages",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          recipient: { id: "17841441111111111" },
          message: { text: "Hi!" },
        }),
      }),
    );
  });

  it("never calls Meta without the venue token", async () => {
    delete process.env.META_ACCESS_TOKEN;
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    await expect(
      sendInstagramMessage({ recipientId: "17841441111111111", text: "Hi!" }),
    ).rejects.toThrow("not configured");
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
