import { aiHostResponseSchema, type AiHostResponse } from "./contract";

export type ConversationMessage = {
  direction: "inbound" | "outbound";
  content: string;
};

export const SAFE_AI_FALLBACK: AiHostResponse = {
  reply:
    "I want to make sure you get the right answer. I’m sending this to our venue team so they can help.",
  intent: "other",
  bookingIntent: false,
  missingQualificationFields: [],
  shareBookingForm: false,
  handoffRequired: true,
  handoffReason: "AI response could not be safely validated",
};

const harmlessNightlifeSlangPattern =
  /\b(?:tryna|finna)\b.{0,60}\b(?:party|club|turn up|after it|meet|vibe|dance)\b|\b(?:mandem|the boys|the mandem)\b.{0,60}\b(?:party|club|turn up|after it|meet|vibe|dance)\b|\b(?:get\s+(?:\w+\s+){0,2}after it|turnt)\b/i;

const staffScheduleQuestionPattern =
  /\b(?:who|which|is|are|will|when)\b.{0,50}\b(?:bartender|server|waiter|waitress|host|hostess|security|bouncer|manager|staff|employee|worker|dj)\b.{0,60}\b(?:working|on shift|scheduled|there|tonight|today|weekend|schedule|roster|contact)|\b(?:bartender|server|waiter|waitress|host|hostess|security|bouncer|manager|staff|employee|worker|dj)\b.{0,50}\b(?:working|on shift|scheduled|there|tonight|today|weekend|schedule|roster|contact)\b|\b(?:bartender|server|waiter|waitress|host|hostess|bouncer)\s+(?:named\s+)?(?!(?:recommend|help|service|menu|drink|working|schedule|there|tonight)\b)[a-z][a-z'-]{1,}\b/i;

const nearbyRecommendationPattern =
  /\b(?:where (?:can|should|could) (?:i|we).{0,35}(?:stay|sleep|eat|drink|go)|(?:recommend|suggest)(?:ation|ations)?(?: for| of)?\s+(?:a |an |some )?(?:hotel|motel|hostel|airbnb|restaurant|bar|club|nightclub|place|spot)|(?:hotel|motel|hostel|airbnb|restaurant|bar|club|nightclub|place|spot)s?\b.{0,40}\b(?:nearby|near you|near the club|walking distance|close by|around here|in the area|recommend|suggest|afterwards?|beforehand)|other\s+(?:bars?|clubs?|nightclubs?|venues?|spots?|places?)|places? to stay)\b/i;

export function deterministicStaffPrivacy(text: string): AiHostResponse | null {
  if (!staffScheduleQuestionPattern.test(text)) return null;

  return {
    reply:
      "I don’t have access to individual staff schedules or who is working. The on-site team will be happy to help when you arrive.",
    intent: "faq",
    bookingIntent: false,
    missingQualificationFields: [],
    shareBookingForm: false,
    handoffRequired: false,
    handoffReason: null,
  };
}

export function deterministicNearbyRecommendation(
  text: string,
): AiHostResponse | null {
  if (!nearbyRecommendationPattern.test(text)) return null;

  return {
    reply:
        "I’m here to help you plan your night at Promotr 😊 I can help with our hours, music, or booking options.",
    intent: "faq",
    bookingIntent: false,
    missingQualificationFields: [],
    shareBookingForm: false,
    handoffRequired: false,
    handoffReason: null,
  };
}

export function conversationalFallback(text: string): AiHostResponse {
  if (harmlessNightlifeSlangPattern.test(text)) {
    return {
      reply:
        "Sounds like you and your crew are after a high-energy, social night 😎 What kind of music and vibe are you looking for?",
      intent: "faq",
      bookingIntent: false,
      missingQualificationFields: [],
      shareBookingForm: false,
      handoffRequired: false,
      handoffReason: null,
    };
  }

  return SAFE_AI_FALLBACK;
}

const complaintPattern =
  /\b(angry|complain|complaint|refund|scam|rude|terrible|awful|security hurt|charged twice)\b/i;
const sensitivePattern =
  /\b(password|credit card|card number|passport|government id|social insurance)\b/i;
const humanContactPattern =
  /\b(contact|speak|talk|connect|reach|message)\b.{0,35}\b(admin|staff|manager|human|person|team|owner)\b|\b(admin|staff|manager|human|person|team|owner)\b.{0,35}\b(contact|speak|talk|connect|reach|message)\b/i;

export function deterministicHandoff(text: string): AiHostResponse | null {
  if (complaintPattern.test(text)) {
    return {
      reply:
        "I’m sorry that happened. I understand why you’d be frustrated, and I’m sending this to our venue team to review.",
      intent: "complaint",
      bookingIntent: false,
      missingQualificationFields: [],
      shareBookingForm: false,
      handoffRequired: true,
      handoffReason: "Guest complaint or refund request",
    };
  }
  if (sensitivePattern.test(text)) {
    return {
      ...SAFE_AI_FALLBACK,
      reply:
        "Please don’t send sensitive or payment information here. I’m sending this to our venue team so they can help safely.",
      handoffReason: "Sensitive information request or disclosure",
    };
  }
  if (humanContactPattern.test(text))
    return {
      ...SAFE_AI_FALLBACK,
      reply:
        "Thanks for letting me know. I’ve sent this to our venue team for priority review, and a staff member can reply here.",
      handoffReason: "Guest requested direct contact with venue staff",
    };
  return null;
}

export function buildBoundedContext(
  messages: ConversationMessage[],
  summary?: string | null,
) {
  return {
    summary: summary?.trim().slice(0, 1200) || null,
    messages: messages.slice(-10).map((message) => ({
      role:
        message.direction === "inbound"
          ? ("user" as const)
          : ("assistant" as const),
      content: message.content.trim().slice(0, 600),
    })),
  };
}

export function parseAiHostResponse(value: unknown) {
  const candidate = typeof value === "string" ? safelyParseJson(value) : value;
  const result = aiHostResponseSchema.safeParse(candidate);
  return result.success ? result.data : SAFE_AI_FALLBACK;
}

function safelyParseJson(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}
