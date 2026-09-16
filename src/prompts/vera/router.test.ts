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
      { role: "user", content: "I need to speak to a manager about a refund" },
    ]);

    expect(result.scenarioIds).toContain("safety_handoff");
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
