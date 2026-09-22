import { describe, expect, it } from "vitest";

import { buildVeraSystemPrompt, selectVeraScenarios } from "./router";
import { VERA_SCENARIO_IDS, type VeraScenarioId } from "./scenarios";

const examples: Array<[VeraScenarioId, string]> = [
  ["opening", "Hi Vera"],
  ["venue_basics", "What are your hours?"],
  ["age_id", "How old do I have to be?"],
  ["entry_guest_list", "How much is cover?"],
  ["tables_reservations", "How much is a booth?"],
  ["dress_code", "Can I wear clean sneakers?"],
  ["celebrations", "Can I bring a birthday cake?"],
  ["music_events", "What music do you play?"],
  ["bottle_menu", "Can I see the bottle menu?"],
  ["bar_food", "Do you serve food?"],
  ["transport", "Is there parking?"],
  ["nearby_recommendations", "Can you recommend a hotel nearby?"],
  ["photos", "Will there be a photographer?"],
  ["private_events", "Can we organize a private event?"],
  ["lost_and_found", "I lost my watch"],
  ["safety_handoff", "I feel unsafe after a fight"],
  ["staff_privacy", "Which bartender is working tonight?"],
  ["complaints", "The service was terrible"],
  ["refunds_cancellations", "Can I get a refund?"],
  ["accessibility", "Is the venue wheelchair accessible?"],
  ["discounts", "Do you offer a discount?"],
  ["identity_social", "Are you an AI?"],
  ["toronto_slang", "Mans tryna pull up"],
  ["general_nightlife", "What should I bring for a night out?"],
  ["off_topic", "What is the capital city of Sri Lanka?"],
];

describe("Vera modular scenario coverage", () => {
  it("has a routing example for every scenario file", () => {
    expect(examples.map(([id]) => id).sort()).toEqual(
      [...VERA_SCENARIO_IDS].sort(),
    );
  });

  it.each(examples)("loads %s for %s", (id, message) => {
    const result = buildVeraSystemPrompt([{ role: "user", content: message }]);

    expect(result.scenarioIds).toContain(id);
    expect(result.systemPrompt).toContain(`[${id}]`);
    expect(result.scenarioIds.length).toBeLessThanOrEqual(3);
  });

  it("does not keep a previous table scenario for a new unrelated question", () => {
    const result = selectVeraScenarios([
      { role: "user", content: "Do you have booths?" },
      { role: "assistant", content: "Yes, we have booths." },
      { role: "user", content: "Can you help debug my JavaScript project?" },
    ]);

    expect(result.scenarioIds).toContain("off_topic");
    expect(result.scenarioIds).not.toContain("tables_reservations");
  });

  it("keeps unrelated prices out of a simple cover answer", () => {
    const result = buildVeraSystemPrompt([
      { role: "user", content: "How much is cover?" },
    ]);

    expect(result.systemPrompt).toContain("$20 CAD");
    expect(result.systemPrompt).not.toContain("$1,500 CAD");
  });
});
