import { beforeEach, describe, expect, it, vi } from "vitest";

const database = vi.hoisted(() => ({ selections: [] as string[] }));

vi.mock("@/lib/notifications/manager-push", () => ({
  notifyVenueManagers: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: (table: string) => {
      if (table === "venues")
        return {
          select: (columns: string) => {
            database.selections.push(`${table}:${columns}`);
            return {
              eq: () => ({
                single: async () => ({
                  data: { id: "venue-id" },
                  error: null,
                }),
              }),
            };
          },
        };
      if (table === "contacts")
        return {
          upsert: () => ({
            select: (columns: string) => {
              database.selections.push(`${table}:${columns}`);
              return {
                single: async () => ({
                  data: { id: "contact-id", display_name: null },
                  error: null,
                }),
              };
            },
          }),
        };
      if (table === "contact_channels")
        return { upsert: async () => ({ error: null }) };
      if (table === "conversations")
        return {
          upsert: () => ({
            select: (columns: string) => {
              database.selections.push(`${table}:${columns}`);
              return {
                single: async () => ({
                  data: { id: "conversation-id" },
                  error: null,
                }),
              };
            },
          }),
        };
      if (table === "messages")
        return { insert: async () => ({ error: null }) };
      throw new Error(`Unexpected table: ${table}`);
    },
  }),
}));

import { ingestInstagramEvent } from "./ingest";

describe("Instagram event ingestion", () => {
  beforeEach(() => {
    database.selections.length = 0;
    process.env.META_INSTAGRAM_ACCOUNT_ID = "venue-account";
  });

  it("loads only real venue columns and requests the contact display name", async () => {
    const result = await ingestInstagramEvent({
      providerMessageId: "message-id",
      senderId: "guest-id",
      recipientId: "venue-account",
      text: "Hello",
      timestamp: 1,
      channel: "instagram",
    });

    expect(result).toMatchObject({
      accepted: true,
      conversationId: "conversation-id",
      shouldHydrateProfile: true,
    });
    expect(database.selections).toContain("venues:id");
    expect(database.selections).toContain("contacts:id,display_name");
    expect(database.selections).not.toContain("venues:id,display_name");
  });
});
