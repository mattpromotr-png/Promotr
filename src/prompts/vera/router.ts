import { VERA_MASTER_PROMPT } from "./master";
import { veraScenarioPlaybooks, type VeraScenarioId } from "./scenarios";

type PromptMessage = { role: "user" | "assistant"; content: string };

// Priority matters when a guest includes several requests in one message.
// Safety and privacy win over sales and general venue facts.
const scenarioPatterns: Array<[VeraScenarioId, RegExp]> = [
  [
    "safety_handoff",
    /\b(?:emergency|unsafe|danger|threat|violence|fight|injur(?:ed|y)|medical|security|drugs?|illegal|intoxicated|too drunk|assault|harass|no id|fake id)\b/i,
  ],
  [
    "staff_privacy",
    /\b(?:who|which|is|are|will|when)\b.{0,50}\b(?:bartender|server|waiter|waitress|host|hostess|security|bouncer|manager|staff|employee|worker|dj)\b.{0,60}\b(?:working|on shift|scheduled|there|tonight|today|weekend|schedule|roster|contact)|\b(?:bartender|server|waiter|waitress|host|hostess|security|bouncer|manager|staff|employee|worker|dj)\b.{0,50}\b(?:working|on shift|scheduled|there|tonight|today|weekend|schedule|roster|contact)|\b(?:bartender|server|waiter|waitress|host|hostess|bouncer)\s+(?:named\s+)?(?!(?:recommend|help|service|menu|drink|working|schedule|there|tonight)\b)[a-z][a-z'-]{1,}\b/i,
  ],
  [
    "refunds_cancellations",
    /\b(?:refund|cancel(?:lation)?|reschedul(?:e|ing)|change (?:my|our|the) (?:booking|reservation)|double charged|charged twice)\b/i,
  ],
  [
    "complaints",
    /\b(?:complain(?:t)?|angry|upset|rude|terrible|awful|discriminat(?:ion|ed)|scam(?:med)?|bad experience)\b/i,
  ],
  [
    "accessibility",
    /\b(?:accessib(?:le|ility)|wheelchair|mobility|step.free|elevator|accessible washroom|accommodation)\b/i,
  ],
  [
    "lost_and_found",
    /\b(?:lost|missing|misplaced|left|forgot|find|found)\b.{0,60}\b(?:phone|watch|wallet|purse|bag|keys?|jacket|coat|card|id|ring|earrings?|necklace|bracelet|glasses|item|belongings?)\b|\b(?:lost and found|lost item|missing item)\b/i,
  ],
  [
    "nearby_recommendations",
    /\b(?:where (?:can|should|could) (?:i|we).{0,35}(?:stay|sleep|eat|drink|go)|(?:recommend|suggest)(?:ation|ations)?(?: for| of)?\s+(?:a |an |some )?(?:hotel|motel|hostel|airbnb|restaurant|bar|club|nightclub|place|spot)|(?:hotel|motel|hostel|airbnb|restaurant|bar|club|nightclub|place|spot)s?\b.{0,40}\b(?:nearby|near you|near the club|walking distance|close by|around here|in the area|recommend|suggest|afterwards?|beforehand)|other\s+(?:bars?|clubs?|nightclubs?|venues?|spots?|places?)|places? to stay)\b/i,
  ],
  [
    "discounts",
    /\b(?:discount|deal|promo code|coupon|free table|complimentary table|free bottle|free drinks?|cheaper|too expensive)\b/i,
  ],
  [
    "private_events",
    /\b(?:private event|private party|buyout|rent (?:the|your) (?:club|venue)|exclusive event|corporate event|large event)\b/i,
  ],
  [
    "photos",
    /\b(?:photos?|pictures?|photograph(?:er|y)?|photo booth|selfie|camera)\b/i,
  ],
  [
    "bottle_menu",
    /\b(?:bottle menu|bottle list|bottle options?|what bottles?|drink menu|bottle service)\b/i,
  ],
  [
    "tables_reservations",
    /\b(?:tables?|booths?|high[ -]?tops?|vip|reserve|reservation|book|booking|minimum spend|party size|guest count|larger group)\b/i,
  ],
  [
    "entry_guest_list",
    /\b(?:cover|admission|guest ?list|free entry|door|line|queue|before 11|eleven|walk[ -]?in|entry fee)\b/i,
  ],
  [
    "age_id",
    /\b(?:19\+|nineteen|underage|how old|minimum age|valid id|photo id|identification|passport|no id)\b/i,
  ],
  [
    "dress_code",
    /\b(?:dress|wear|outfit|clothes|clothing|sneaker|shoe|hat|jersey|sweatpants|boots?)\b/i,
  ],
  [
    "celebrations",
    /\b(?:birthday|celebrat|cake|decor|sparkler|anniversary|occasion|upgrade)\b/i,
  ],
  [
    "music_events",
    /\b(?:music|dj|artist|event|celebrity|performer|promotion|hip[ -]?hop|r&b|afrobeats?|house|top 40|club hits?)\b/i,
  ],
  [
    "bar_food",
    /\b(?:bar|drink|cocktail|alcohol|vodka|tequila|champagne|food|menu|eat|beer|spirits?)\b/i,
  ],
  [
    "transport",
    /\b(?:parking|park|ttc|uber|lyft|taxi|walk|transit|subway|directions?|rideshare)\b/i,
  ],
  [
    "venue_basics",
    /\b(?:address|location|where are you|hours?|open|close|time|tomorrow|today|thursday|friday|saturday|sunday|monday|tuesday|wednesday)\b/i,
  ],
  [
    "identity_social",
    /\b(?:first time|never been|are you (?:an? )?ai|are you real|are you there|who are you|who am i talking to|remember me|remember what|previous chat|vera)\b/i,
  ],
  [
    "toronto_slang",
    /\b(?:tryna|finna|mans|mandem|the boys|the mandem|get after it|turnt|lit|bare|ahlie|wallahi|nize it|wasteyute|bucktee|cheesed|fam|styll|yute|gyal|tings?|say less|reach|pull up)\b/i,
  ],
];

const shortFollowupPattern =
  /^(?:how much(?: is it)?|what(?:'s| is) included|what about (?:that|it|the other one)|which one|can you tell me more|yes|yeah|sure|okay|and (?:for )?\w+(?:\s+\w+){0,3})\??$/i;
const MAX_SCENARIOS = 3;

function matchedScenarios(text: string) {
  return scenarioPatterns
    .filter(([, pattern]) => pattern.test(text))
    .map(([scenario]) => scenario);
}

export function selectVeraScenarios(messages: PromptMessage[]) {
  const latestUserIndex = messages.findLastIndex(
    (message) => message.role === "user",
  );
  const latestUser =
    latestUserIndex >= 0 ? messages[latestUserIndex]?.content.trim() || "" : "";
  const userMessageCount = messages.filter(
    (message) => message.role === "user",
  ).length;
  let topics = matchedScenarios(latestUser);

  // Earlier messages clarify genuinely short follow-ups; they do not drag an
  // unrelated new question back into an old booking or table scenario.
  if (!topics.length && shortFollowupPattern.test(latestUser)) {
    const recentContext = messages
      .slice(Math.max(0, latestUserIndex - 2), latestUserIndex)
      .map((message) => message.content)
      .join(" ")
      .slice(-1000);
    topics = matchedScenarios(recentContext);
  }

  const selected: VeraScenarioId[] = [];
  if (userMessageCount <= 1) selected.push("opening");
  for (const topic of topics) {
    if (!selected.includes(topic)) selected.push(topic);
    if (selected.length >= MAX_SCENARIOS) break;
  }
  if (!topics.length && selected.length < MAX_SCENARIOS)
    selected.push("general_nightlife");

  return { latestUser, scenarioIds: selected };
}

export function buildVeraSystemPrompt(messages: PromptMessage[]) {
  const selection = selectVeraScenarios(messages);
  const playbooks = selection.scenarioIds
    .map((scenario) => `[${scenario}]\n${veraScenarioPlaybooks[scenario]}`)
    .join("\n\n");

  return {
    ...selection,
    systemPrompt: `${VERA_MASTER_PROMPT}\n\nRelevant playbooks for this turn:\n${playbooks}`,
  };
}
