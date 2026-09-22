import { describe, expect, it } from "vitest";

import { asksAboutPastConversation, loadRecallExcerpts } from "./recall";

describe("conversation recall trigger", () => {
  it("looks back for explicit memory questions", () => {
    expect(asksAboutPastConversation("Do you remember me?")).toBe(true);
    expect(asksAboutPastConversation("What did I tell you last time?")).toBe(
      true,
    );
    expect(asksAboutPastConversation("Can you recall our previous chat?")).toBe(
      true,
    );
  });

  it("does not expand ordinary venue questions", () => {
    expect(asksAboutPastConversation("How much is a booth?")).toBe(false);
    expect(asksAboutPastConversation("I remember my birthday last year")).toBe(
      false,
    );
  });

  it("reads only conversations belonging to the verified contact in the venue", async () => {
    const filters: Array<[string, string]> = [];
    let queriedConversationIds: string[] = [];
    const conversationsQuery = {
      select() {
        return this;
      },
      eq(column: string, value: string) {
        filters.push([column, value]);
        return this;
      },
      async limit() {
        return {
          data: [
            { id: "sms-conversation", channel: "sms" },
            { id: "instagram-conversation", channel: "instagram" },
          ],
          error: null,
        };
      },
    };
    const messagesQuery = {
      select() {
        return this;
      },
      in(_column: string, ids: string[]) {
        queriedConversationIds = ids;
        return this;
      },
      order() {
        return this;
      },
      async limit() {
        return {
          data: [
            {
              conversation_id: "instagram-conversation",
              direction: "inbound",
              content: "I mentioned my birthday.",
            },
            {
              conversation_id: "sms-conversation",
              direction: "outbound",
              content: "Happy to help!",
            },
          ],
          error: null,
        };
      },
    };
    const admin = {
      from(table: string) {
        return table === "conversations" ? conversationsQuery : messagesQuery;
      },
    } as unknown as Parameters<typeof loadRecallExcerpts>[0];

    const result = await loadRecallExcerpts(
      admin,
      "venue-1",
      "verified-contact-1",
      "Do you remember me?",
    );

    expect(filters).toEqual([
      ["venue_id", "venue-1"],
      ["contact_id", "verified-contact-1"],
    ]);
    expect(queriedConversationIds).toEqual([
      "sms-conversation",
      "instagram-conversation",
    ]);
    expect(result).toEqual([
      { channel: "sms", role: "venue", content: "Happy to help!" },
      {
        channel: "instagram",
        role: "guest",
        content: "I mentioned my birthday.",
      },
    ]);
  });
});
