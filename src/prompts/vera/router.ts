import { VERA_CORE_PROMPT } from "./core";
import { veraScenarioPlaybooks, type VeraScenarioId } from "./scenarios";

type PromptMessage = { role: "user" | "assistant"; content: string };

const scenarioPatterns: Array<[VeraScenarioId, RegExp]> = [
  [
    "lost_and_found",
    /\b(?:lost|missing|misplaced|left|forgot|find|found)\b.{0,60}\b(?:phone|watch|wallet|purse|bag|keys?|jacket|coat|card|id|ring|earrings?|necklace|bracelet|glasses|item|belongings?)\b|\b(?:lost and found|lost item|missing item)\b/i,
  ],
  [
    "toronto_slang",
    /\b(?:tryna|finna|mans|mandem|the boys|the mandem|get after it|turnt|lit|bare|ahlie|wallahi|nize it|wasteyute|bucktee|cheesed|fam|styll|yute|gyal|tings?|say less|reach|pull up)\b/i,
  ],
  [
    "staff_privacy",
    /\b(?:who|which|is|are|will|when)\b.{0,50}\b(?:bartender|server|waiter|waitress|host|hostess|security|bouncer|manager|staff|employee|worker|dj)\b.{0,60}\b(?:working|on shift|scheduled|there|tonight|today|weekend|schedule|roster|contact)|\b(?:bartender|server|waiter|waitress|host|hostess|security|bouncer|manager|staff|employee|worker|dj)\b.{0,50}\b(?:working|on shift|scheduled|there|tonight|today|weekend|schedule|roster|contact)\b|\b(?:bartender|server|waiter|waitress|host|hostess|bouncer)\s+(?:named\s+)?(?!(?:recommend|help|service|menu|drink|working|schedule|there|tonight)\b)[a-z][a-z'-]{1,}\b/i,
  ],
  [
    "safety_handoff",
    /\b(admin|staff|manager|human|person|team|owner|complain|complaint|refund|cancel|change|security|unsafe|danger|emergency|drunk|intoxicated|drug|fight|hurt|charged|password|card number|passport|government id)\b/i,
  ],
  [
    "bottle_menu",
    /\b(bottle menu|bottle list|bottle options?|what bottles?|drink menu)\b/i,
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
  let matchedTopic = false;

  if (userMessageCount <= 1) selected.push("opening");
  for (const [scenario, pattern] of scenarioPatterns) {
    if (pattern.test(recentContext) && !selected.includes(scenario)) {
      selected.push(scenario);
      matchedTopic = true;
    }
    if (selected.length >= 3) break;
  }
  if (!matchedTopic) selected.push("general_nightlife");

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
