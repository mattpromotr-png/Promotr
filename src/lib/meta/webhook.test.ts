import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { normalizeInstagramEvents, verifyMetaSignature } from "./webhook";

describe("Meta webhook boundary", () => {
  it("validates sha256 signatures", () => {
    const body = '{"object":"instagram"}';
    const secret = "secret";
    const signature = `sha256=${createHmac("sha256", secret).update(body).digest("hex")}`;
    expect(verifyMetaSignature(Buffer.from(body), signature, secret)).toBe(true);
    expect(verifyMetaSignature(Buffer.from(body + "x"), signature, secret)).toBe(false);
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
});
