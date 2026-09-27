import { describe, expect, it } from "vitest";
import { buildVeraSystemPrompt, selectVeraScenarios } from "./router";

describe("Vera prompt routing", () => {
  it("adds the opening rule and only relevant venue facts for a first message", () => {
    const result = buildVeraSystemPrompt([
      { role: "user", content: "What time are you open Thursday?" },
    ]);

    expect(result.scenarioIds).toEqual(["opening", "venue_basics"]);
    expect(result.systemPrompt).toContain("Who am I speaking with?");
    expect(result.systemPrompt).toContain("Thursday");
    expect(result.systemPrompt).not.toContain("$1500");
  });

  it("uses recent context for short table follow-ups", () => {
    const result = selectVeraScenarios([
      { role: "user", content: "Do you have booths?" },
      { role: "assistant", content: "Yes. How many guests are joining?" },
      { role: "user", content: "How much?" },
    ]);

    expect(result.scenarioIds).toContain("tables_reservations");
  });

  it("prioritizes safety and handoff rules", () => {
    const result = selectVeraScenarios([
      { role: "user", content: "I feel unsafe after a fight" },
    ]);

    expect(result.scenarioIds).toContain("safety_handoff");
  });

  it("routes refunds to their own policy without pretending to know the outcome", () => {
    const result = buildVeraSystemPrompt([
      { role: "user", content: "Can I get a refund?" },
    ]);

    expect(result.scenarioIds).toContain("refunds_cancellations");
    expect(result.systemPrompt).toContain("Do not invent refund");
  });

  it("loads the approved bottle menu without unrelated facts", () => {
    const result = buildVeraSystemPrompt([
      { role: "user", content: "Can you send the bottle menu?" },
    ]);

    expect(result.scenarioIds).toContain("bottle_menu");
    expect(result.systemPrompt).toContain("High Top: $500 CAD");
    expect(result.systemPrompt).toContain("Booth: $1,500 CAD");
    expect(result.systemPrompt).not.toContain("premium vodka $450");
  });

  it("loads the lost-and-found safety playbook for missing items", () => {
    const result = buildVeraSystemPrompt([
      { role: "user", content: "I think I lost my watch near our table" },
    ]);

    expect(result.scenarioIds).toContain("lost_and_found");
    expect(result.systemPrompt).toContain("Never claim an item is theirs");
  });

  it("uses the general nightlife fallback for an unlisted planning question", () => {
    const result = buildVeraSystemPrompt([
      { role: "user", content: "What should I bring for a night out?" },
    ]);

    expect(result.scenarioIds).toEqual(["opening", "general_nightlife"]);
    expect(result.systemPrompt).toContain("ordinary general knowledge");
    expect(result.systemPrompt).toContain("not confirmed Promotr policy");
  });

  it("understands Toronto nightlife slang without treating it as a handoff", () => {
    const result = buildVeraSystemPrompt([
      {
        role: "user",
        content:
          "Me and the boys are tryna get absolutely after it and meet some broads",
      },
    ]);

    expect(result.scenarioIds).toContain("toronto_slang");
    expect(result.systemPrompt).toContain(
      "Slang, casual grammar, mild profanity, or unfamiliar phrasing alone never requires staff handoff",
    );
    expect(result.systemPrompt).toContain("Reframe them respectfully");
    expect(result.systemPrompt).toContain("mans: I, we, me, us, them");
  });

  it("protects private staff schedules and does not offer to check", () => {
    const result = buildVeraSystemPrompt([
      { role: "user", content: "Which bartender is working tonight?" },
    ]);

    expect(result.scenarioIds).toContain("staff_privacy");
    expect(result.systemPrompt).toContain(
      "individual staff schedules are private",
    );
    expect(result.systemPrompt).toContain("Do not offer to check");
  });

  it("redirects nearby-business requests without advertising competitors", () => {
    const result = buildVeraSystemPrompt([
      {
        role: "user",
        content: "Can you recommend a hotel within walking distance?",
      },
    ]);

    expect(result.scenarioIds).toContain("nearby_recommendations");
    expect(result.systemPrompt).toContain(
      "do not name or recommend external businesses",
    );
    expect(result.systemPrompt).toContain("Do not offer staff recommendations");
    expect(result.systemPrompt).toContain("never name, recommend, link to");
    expect(result.systemPrompt).toContain("do not start every reply");
  });

  it("redirects unrelated questions without pretending to be a general assistant", () => {
    const result = buildVeraSystemPrompt([
      { role: "user", content: "Can you help debug my JavaScript project?" },
    ]);

    expect(result.scenarioIds).toContain("off_topic");
    expect(result.systemPrompt).toContain("Do not provide the answer or extra facts");
    expect(result.systemPrompt).toContain(
      "pivot to a single useful Promotr topic",
    );
    expect(result.systemPrompt).toContain(
      "do not answer its factual substance",
    );
  });

  it("does not invite geography chat after the exact Instagram off-topic exchange", () => {
    const first = buildVeraSystemPrompt([
      { role: "user", content: "do you know the country sri lanka" },
    ]);
    expect(first.scenarioIds).toContain("off_topic");
    expect(first.systemPrompt).toContain("Do not provide the answer or extra facts");

    const followup = buildVeraSystemPrompt([
      { role: "user", content: "do you know the country sri lanka" },
      { role: "assistant", content: "I can help with Promotr." },
      { role: "user", content: "what is capital city there?" },
    ]);
    expect(followup.scenarioIds).toContain("off_topic");
    expect(followup.scenarioIds).not.toContain("tables_reservations");
    expect(followup.systemPrompt).toContain("If they repeat the off-topic question");
  });

  it.each([
    "What is machine learning?",
    "What is the fifth planet in the solar system?",
    "What is the sun's temperature?",
    "What time is it in Tokyo?",
  ])("keeps the general off-topic boundary for %s", (question) => {
    const result = buildVeraSystemPrompt([
      { role: "user", content: question },
    ]);

    expect(result.systemPrompt).toContain("do not answer its factual substance");
    expect(result.systemPrompt).toContain("First judge the meaning of the latest guest question");
    if (question !== "What time is it in Tokyo?") {
      expect(result.scenarioIds).toContain("general_nightlife");
      expect(result.systemPrompt).toContain("do not answer the unrelated question");
    }
  });

  it("never loads more than three scenario modules", () => {
    const result = selectVeraScenarios([
      {
        role: "user",
        content:
          "Can a manager help with a birthday table, guest list, dress code and parking?",
      },
    ]);

    expect(result.scenarioIds.length).toBeLessThanOrEqual(3);
  });
});
