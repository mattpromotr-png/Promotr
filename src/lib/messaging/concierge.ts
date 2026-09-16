import "server-only";

import { aiHostResponseSchema, type AiHostResponse } from "@/lib/ai/contract";
import { deterministicHandoff, SAFE_AI_FALLBACK } from "@/lib/ai/orchestration";
import { latestMessageAllowsBookingLink } from "@/lib/messaging/policy";
import { buildVeraSystemPrompt } from "@/prompts/vera";

type ConciergeMessage = { role: "user" | "assistant"; content: string };

export async function generateConciergeReply(
  messages: ConciergeMessage[],
): Promise<AiHostResponse> {
  const recent = messages.slice(-8).map((message) => ({
    role: message.role,
    content: message.content.trim().slice(0, 600),
  }));
  const latest = recent.at(-1)?.content || "";
  const deterministic = deterministicHandoff(latest);
  if (deterministic) return deterministic;
  const { systemPrompt } = buildVeraSystemPrompt(recent);
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error("Concierge response unavailable: OPENAI_API_KEY is missing");
    return SAFE_AI_FALLBACK;
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
            content: systemPrompt,
          },
          ...recent,
        ],
        max_output_tokens: 300,
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
              },
              required: [
                "reply",
                "intent",
                "bookingIntent",
                "missingQualificationFields",
                "shareBookingForm",
                "handoffRequired",
                "handoffReason",
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
      return SAFE_AI_FALLBACK;
    }
    const payload = (await response.json()) as {
      output?: Array<{
        content?: Array<{ type?: string; text?: string }>;
      }>;
    };
    const outputText = payload.output
      ?.flatMap((item) => item.content || [])
      .find((item) => item.type === "output_text")?.text;
    const parsed = aiHostResponseSchema.safeParse(
      JSON.parse(outputText || "null"),
    );
    if (!parsed.success) {
      console.error("Concierge response failed schema validation", {
        requestId: response.headers.get("x-request-id"),
      });
      return SAFE_AI_FALLBACK;
    }
    return {
      ...parsed.data,
      missingQualificationFields: [],
      shareBookingForm:
        parsed.data.shareBookingForm && latestMessageAllowsBookingLink(latest),
    };
  } catch (error) {
    console.error("Concierge response processing failed", {
      name: error instanceof Error ? error.name : "UnknownError",
    });
    return SAFE_AI_FALLBACK;
  }
}

export function smsConciergeText(result: AiHostResponse) {
  const reply = result.reply.replace(/https?:\/\/\S+/gi, "").trim();
  if (!result.shareBookingForm) return reply;
  return `${reply} Booking inquiry: ${process.env.NEXT_PUBLIC_APP_URL}/book`;
}
