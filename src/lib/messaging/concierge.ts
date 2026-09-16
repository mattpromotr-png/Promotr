import "server-only";

import {
  conciergeIntelligenceSchema,
  type ConciergeIntelligence,
} from "@/lib/ai/concierge-intelligence";
import { aiHostResponseSchema, type AiHostResponse } from "@/lib/ai/contract";
import { deterministicHandoff, SAFE_AI_FALLBACK } from "@/lib/ai/orchestration";
import { conversationAllowsBookingLink } from "@/lib/messaging/policy";
import { buildVeraSystemPrompt } from "@/prompts/vera";

type ConciergeMessage = { role: "user" | "assistant"; content: string };
export type ConciergeResult = AiHostResponse & ConciergeIntelligence;

type ConciergeMemoryContext = {
  summary?: string | null;
  contactMemory?: Record<string, unknown> | null;
  knownName?: string | null;
  preferredLanguage?: string | null;
};

export async function generateConciergeReply(
  messages: ConciergeMessage[],
  memoryContext: ConciergeMemoryContext = {},
): Promise<ConciergeResult> {
  const recent = messages.slice(-8).map((message) => ({
    role: message.role,
    content: message.content.trim().slice(0, 600),
  }));
  const latest = recent.at(-1)?.content || "";
  const deterministic = deterministicHandoff(latest);
  if (deterministic) return withFallbackIntelligence(deterministic, latest);
  const { systemPrompt } = buildVeraSystemPrompt(recent);
  const intelligenceInstructions = `Operational output fields: detect the language of the latest guest message; translate that message and your reply faithfully into English; extract guestFirstName only when the guest explicitly supplied it; keep memoryFacts to durable guest preferences or personal details explicitly stated; and write a compact conversationSummary preserving names, preferences, current request, and unresolved questions. Never treat inferred or unconfirmed booking details as verified facts.`;
  const suppliedMemory = JSON.stringify({
    summary: memoryContext.summary || null,
    contactMemory: memoryContext.contactMemory || {},
    knownName: memoryContext.knownName || null,
    preferredLanguage: memoryContext.preferredLanguage || null,
  });
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error("Concierge response unavailable: OPENAI_API_KEY is missing");
    return withFallbackIntelligence(SAFE_AI_FALLBACK, latest);
  }

  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
        input: [
          {
            role: "system",
            content: `${systemPrompt}\n\n${intelligenceInstructions}\n\nStored conversation memory (may be empty):\n${suppliedMemory}`,
          },
          ...recent,
        ],
        max_output_tokens: 500,
        text: {
          format: {
            type: "json_schema",
            name: "promotr_guest_concierge",
            strict: true,
            schema: {
              type: "object",
              additionalProperties: false,
              properties: {
                reply: { type: "string" },
                intent: {
                  type: "string",
                  enum: [
                    "faq",
                    "guest_list",
                    "table",
                    "birthday",
                    "complaint",
                    "booking",
                    "other",
                  ],
                },
                bookingIntent: { type: "boolean" },
                missingQualificationFields: {
                  type: "array",
                  items: {
                    type: "string",
                    enum: [
                      "date",
                      "party_size",
                      "occasion",
                      "booking_type",
                      "bottle_preference",
                    ],
                  },
                },
                shareBookingForm: { type: "boolean" },
                handoffRequired: { type: "boolean" },
                handoffReason: { type: ["string", "null"] },
                detectedLanguage: { type: "string" },
                latestGuestMessageEnglish: { type: "string" },
                replyEnglish: { type: "string" },
                guestFirstName: { type: ["string", "null"] },
                memoryFacts: {
                  type: "array",
                  items: { type: "string" },
                  maxItems: 8,
                },
                conversationSummary: { type: "string" },
              },
              required: [
                "reply",
                "intent",
                "bookingIntent",
                "missingQualificationFields",
                "shareBookingForm",
                "handoffRequired",
                "handoffReason",
                "detectedLanguage",
                "latestGuestMessageEnglish",
                "replyEnglish",
                "guestFirstName",
                "memoryFacts",
                "conversationSummary",
              ],
            },
          },
        },
      }),
      cache: "no-store",
    });
    if (!response.ok) {
      console.error("Concierge OpenAI request failed", {
        status: response.status,
        requestId: response.headers.get("x-request-id"),
      });
      return withFallbackIntelligence(SAFE_AI_FALLBACK, latest);
    }
    const payload = (await response.json()) as {
      output?: Array<{
        content?: Array<{ type?: string; text?: string }>;
      }>;
    };
    const outputText = payload.output
      ?.flatMap((item) => item.content || [])
      .find((item) => item.type === "output_text")?.text;
    const output = JSON.parse(outputText || "null");
    const parsed = aiHostResponseSchema.safeParse(output);
    const intelligence = conciergeIntelligenceSchema.safeParse(output);
    if (!parsed.success || !intelligence.success) {
      console.error("Concierge response failed schema validation", {
        requestId: response.headers.get("x-request-id"),
      });
      return withFallbackIntelligence(SAFE_AI_FALLBACK, latest);
    }
    return {
      ...parsed.data,
      ...intelligence.data,
      missingQualificationFields: [],
      shareBookingForm:
        parsed.data.shareBookingForm && conversationAllowsBookingLink(recent),
    };
  } catch (error) {
    console.error("Concierge response processing failed", {
      name: error instanceof Error ? error.name : "UnknownError",
    });
    return withFallbackIntelligence(SAFE_AI_FALLBACK, latest);
  }
}

function withFallbackIntelligence(
  response: AiHostResponse,
  latestGuestMessage: string,
): ConciergeResult {
  return {
    ...response,
    detectedLanguage: "Unknown",
    latestGuestMessageEnglish: latestGuestMessage,
    replyEnglish: response.reply,
    guestFirstName: null,
    memoryFacts: [],
    conversationSummary:
      latestGuestMessage.slice(0, 600) || "No conversation summary available.",
  };
}

export function smsConciergeText(result: AiHostResponse) {
  const reply = result.reply.replace(/https?:\/\/\S+/gi, "").trim();
  if (!result.shareBookingForm) return reply;
  return `${reply} Booking inquiry: ${process.env.NEXT_PUBLIC_APP_URL}/book`;
}
