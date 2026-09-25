import { afterEach, describe, expect, it, vi } from "vitest";

import {
  decodeBase64Url,
  encodeBase64Url,
  getGmailMessage,
} from "@/lib/gmail/client";
import { cleanEmailText, parseMailbox } from "@/lib/gmail/sync";
import { buildReplyMime } from "@/lib/messaging/email-conversation";

describe("Gmail message helpers", () => {
  afterEach(() => vi.restoreAllMocks());

  it("skips a message removed after Gmail listed it in history", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(null, { status: 404 }),
    );
    await expect(
      getGmailMessage("test-token", "deleted-message"),
    ).resolves.toBeNull();
  });

  it("still reports Gmail failures other than a missing message", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(null, { status: 503 }),
    );
    await expect(
      getGmailMessage("test-token", "existing-message"),
    ).rejects.toThrow("Gmail API request failed (503).");
  });

  it("parses named and plain mailbox addresses", () => {
    expect(parseMailbox("Jake M. <JAKE@example.com>")).toEqual({
      email: "jake@example.com",
      name: "Jake M.",
    });
    expect(parseMailbox("guest@example.com")).toEqual({
      email: "guest@example.com",
      name: null,
    });
  });

  it("removes quoted reply history before Vera receives the message", () => {
    expect(
      cleanEmailText(
        "Can we book for Friday?\n\nOn Thu, Promotr wrote:\n> Previous reply",
      ),
    ).toBe("Can we book for Friday?");
  });

  it("builds a threaded reply without allowing header injection", () => {
    const mime = buildReplyMime({
      from: "matt.promotr@gmail.com",
      to: "guest@example.com\r\nBcc: attacker@example.com",
      subject: "Friday table",
      content: "Happy to help!",
      inReplyTo: "<guest-message@example.com>",
    });
    expect(mime).toContain("Subject: Re: Friday table");
    expect(mime).toContain("In-Reply-To: <guest-message@example.com>");
    expect(mime).not.toContain("\r\nBcc:");
  });

  it("round trips Gmail base64url content", () => {
    const content = "Hello from Vera ✨";
    expect(decodeBase64Url(encodeBase64Url(content))).toBe(content);
  });
});
