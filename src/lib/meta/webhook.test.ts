import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  describeInstagramWebhookShape,
  normalizeInstagramEvents,
  verifyMetaSignature,
} from "./webhook";

describe("Meta webhook boundary", () => {
  it("validates sha256 signatures", () => {
    const body = '{"object":"instagram"}';
    const secret = "secret";
    const signature = `sha256=${createHmac("sha256", secret).update(body).digest("hex")}`;
    expect(verifyMetaSignature(Buffer.from(body), signature, secret)).toBe(
      true,
    );
    expect(
      verifyMetaSignature(Buffer.from(body + "x"), signature, secret),
    ).toBe(false);
  });
  it("normalizes text and ignores echoes", () => {
    const payload = {
      entry: [
        {
          time: 123,
          messaging: [
            {
              sender: { id: "guest" },
              recipient: { id: "venue" },
              message: { mid: "m1", text: "Tables Friday?" },
            },
            {
              sender: { id: "venue" },
              recipient: { id: "guest" },
              message: { mid: "m2", text: "Reply", is_echo: true },
            },
          ],
        },
      ],
    };
    expect(normalizeInstagramEvents(payload)).toEqual([
      {
        providerMessageId: "m1",
        senderId: "guest",
        recipientId: "venue",
        text: "Tables Friday?",
        timestamp: 123,
        channel: "instagram",
      },
    ]);
  });
  it("describes unsupported events without logging guest content or IDs", () => {
    const description = describeInstagramWebhookShape({
      object: "instagram",
      entry: [
        {
          id: "private-account-id",
          messaging: [
            {
              sender: { id: "private-sender-id" },
              recipient: { id: "private-recipient-id" },
              message: {
                mid: "private-mid",
                text: "private guest message",
                is_echo: true,
              },
            },
          ],
          changes: [
            { field: "messages", value: { text: "private changed message" } },
          ],
        },
      ],
    });
    expect(description).toMatchObject({
      object: "instagram",
      entryCount: 1,
      messagingCount: 1,
      changesCount: 1,
      changeFields: ["messages"],
      messaging: [
        { hasSender: true, hasRecipient: true, hasText: true, isEcho: true },
      ],
    });
    expect(JSON.stringify(description)).not.toMatch(/private/);
  });
});
