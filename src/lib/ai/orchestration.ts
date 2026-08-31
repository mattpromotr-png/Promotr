import { aiHostResponseSchema, type AiHostResponse } from "./contract";

export type ConversationMessage = {
  direction: "inbound" | "outbound";
  content: string;
};

export const SAFE_AI_FALLBACK: AiHostResponse = {
  reply:
    "I want to make sure you get the right answer. I’m passing this to the team so they can help you out.",
  intent: "other",
  bookingIntent: false,
  missingQualificationFields: [],
  shareBookingForm: false,
  handoffRequired: true,
  handoffReason: "AI response could not be safely validated",
};

const complaintPattern =
  /\b(angry|complain|complaint|refund|scam|rude|terrible|awful|security hurt|charged twice)\b/i;
const sensitivePattern =
  /\b(password|credit card|card number|passport|government id|social insurance)\b/i;

export function deterministicHandoff(text: string): AiHostResponse | null {
  if (complaintPattern.test(text)) {
    return {
      reply:
        "Ahh, I’m sorry that happened 😕 I understand why you’d be frustrated. I’m passing this to the team so they can look into it.",
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
        "Please don’t send sensitive or payment information here. I’m passing this to the team so they can help safely.",
      handoffReason: "Sensitive information request or disclosure",
    };
  }
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
