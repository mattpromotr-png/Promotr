import { VERA_CORE_PROMPT } from "./core";
import { veraScenarioPlaybooks, type VeraScenarioId } from "./scenarios";

type PromptMessage = { role: "user" | "assistant"; content: string };

const scenarioPatterns: Array<[VeraScenarioId, RegExp]> = [
  [
    "safety_handoff",
    /\b(admin|staff|manager|human|person|team|owner|complain|complaint|refund|cancel|change|security|unsafe|danger|emergency|drunk|intoxicated|drug|fight|hurt|charged|password|card number|passport|government id)\b/i,
  ],
  [
    "tables_reservations",
    /\b(tables?|booths?|high[ -]?tops?|vip|bottle service|reserve|reservation|book|booking|minimum spend|party size|guest count)\b/i,
  ],
  [
    "entry_guest_list",
    /\b(cover|entry|admission|guest ?list|free entry|door|line|queue|before 11|eleven|walk[ -]?in)\b/i,
  ],
  [
    "venue_basics",
    /\b(address|location|where|hours?|open|close|time|age|19\+|nineteen|id|identification|thursday|friday|saturday|sunday|monday|tuesday|wednesday)\b/i,
  ],
  [
    "dress_code",
    /\b(dress|wear|outfit|clothes|clothing|sneaker|shoe|hat|jersey|sweatpants|boots?)\b/i,
  ],
  [
    "celebrations",
    /\b(birthday|celebrat|cake|decor|sparkler|sign|anniversary|occasion|free bottle|upgrade)\b/i,
  ],
  [
    "music_events",
    /\b(music|dj|artist|event|celebrity|promotion|hip[ -]?hop|r&b|afrobeats?|house|top 40|club hits?)\b/i,
  ],
  [
    "bar_food",
    /\b(bar|drink|cocktail|alcohol|bottle|vodka|tequila|champagne|food|menu|eat)\b/i,
  ],
  [
    "transport",
    /\b(parking|park|ttc|uber|lyft|taxi|walk|transit|subway|directions?)\b/i,
  ],
  [
    "identity_social",
    /\b(first time|never been|are you (?:an? )?ai|are you real|are you there|who are you|vera)\b/i,
  ],
];

export function selectVeraScenarios(messages: PromptMessage[]) {
  const latestUserIndex = messages.findLastIndex(
    (message) => message.role === "user",
  );
  const latestUser =
    latestUserIndex >= 0 ? messages[latestUserIndex]?.content.trim() || "" : "";
  const recentContext = messages
    .slice(Math.max(0, latestUserIndex - 2), latestUserIndex + 1)
    .map((message) => message.content)
    .join(" \n")
    .slice(-1400);
  const userMessageCount = messages.filter(
    (message) => message.role === "user",
  ).length;
  const selected: VeraScenarioId[] = [];

  if (userMessageCount <= 1) selected.push("opening");
  for (const [scenario, pattern] of scenarioPatterns) {
    if (pattern.test(recentContext) && !selected.includes(scenario)) {
      selected.push(scenario);
    }
    if (selected.length >= 3) break;
  }
  if (selected.length === 0) selected.push("identity_social");

  return { latestUser, scenarioIds: selected };
}

export function buildVeraSystemPrompt(messages: PromptMessage[]) {
  const selection = selectVeraScenarios(messages);
  const playbooks = selection.scenarioIds
    .map((scenario) => `[${scenario}]\n${veraScenarioPlaybooks[scenario]}`)
    .join("\n\n");

  return {
    ...selection,
    systemPrompt: `${VERA_CORE_PROMPT}\n\nRelevant playbooks for this turn:\n${playbooks}`,
  };
}
