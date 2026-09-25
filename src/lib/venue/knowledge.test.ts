import { describe, expect, it } from "vitest";

import {
  formatActiveVenueKnowledge,
  getVenueKnowledgeDisplayStatus,
  readActiveVenueKnowledge,
  readVenueKnowledgeUpdates,
} from "./knowledge";

const facts = {
  knowledgeUpdates: [
    {
      id: "active",
      category: "menu",
      title: "Champagne only",
      content: "Only champagne is available tonight.",
      effectiveFrom: "2026-09-25T20:00:00.000Z",
      effectiveUntil: "2026-09-26T08:00:00.000Z",
      status: "published",
      createdAt: "2026-09-25T18:00:00.000Z",
      updatedAt: "2026-09-25T19:00:00.000Z",
      publishedAt: "2026-09-25T19:00:00.000Z",
      inactiveAt: null,
      updatedBy: "manager",
    },
    {
      id: "draft",
      category: "events",
      title: "Possible DJ",
      content: "This is not confirmed.",
      effectiveFrom: null,
      effectiveUntil: null,
      status: "draft",
      createdAt: "2026-09-25T18:00:00.000Z",
      updatedAt: "2026-09-25T18:00:00.000Z",
      publishedAt: null,
      inactiveAt: null,
      updatedBy: "manager",
    },
  ],
};

describe("venue knowledge", () => {
  it("returns only published updates inside their active window", () => {
    const active = readActiveVenueKnowledge(
      facts,
      new Date("2026-09-26T01:00:00.000Z"),
    );

    expect(active).toHaveLength(1);
    expect(active[0]?.title).toBe("Champagne only");
    expect(formatActiveVenueKnowledge(active)).toContain(
      "Only champagne is available tonight.",
    );
  });

  it("keeps draft history without exposing it as active knowledge", () => {
    expect(readVenueKnowledgeUpdates(facts)).toHaveLength(2);
    expect(
      getVenueKnowledgeDisplayStatus(
        readVenueKnowledgeUpdates(facts)[1]!,
        new Date("2026-09-26T01:00:00.000Z"),
      ),
    ).toBe("draft");
  });

  it("expires published information automatically", () => {
    expect(
      getVenueKnowledgeDisplayStatus(
        readVenueKnowledgeUpdates(facts)[0]!,
        new Date("2026-09-27T01:00:00.000Z"),
      ),
    ).toBe("expired");
    expect(
      readActiveVenueKnowledge(facts, new Date("2026-09-27T01:00:00.000Z")),
    ).toHaveLength(0);
  });
});
