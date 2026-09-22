import "server-only";

import { z } from "zod";

const translationSchema = z.object({
  translatedText: z.string().trim().min(1).max(2000),
});

export async function translateStaffReply(
  text: string,
  targetLanguage: string,
) {
  if (!targetLanguage || targetLanguage.toLowerCase() === "english")
    return text;
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey)
    throw new Error(
      "Staff translation requires OPENAI_API_KEY on the main application server.",
    );
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
          content: `Translate the staff message into ${targetLanguage}. Preserve Promotr, names, prices, dates, URLs, tone, and meaning exactly. Add no facts, promises, explanations, or markdown.`,
        },
        { role: "user", content: text },
      ],
      max_output_tokens: 500,
      text: {
        format: {
          type: "json_schema",
          name: "staff_reply_translation",
          strict: true,
          schema: {
            type: "object",
            additionalProperties: false,
            properties: { translatedText: { type: "string" } },
            required: ["translatedText"],
          },
        },
      },
    }),
    cache: "no-store",
  });
  if (!response.ok) throw new Error("Unable to translate the staff reply.");
  const payload = (await response.json()) as {
    output_text?: string;
    output?: Array<{ content?: Array<{ type?: string; text?: string }> }>;
  };
  const outputText =
    payload.output_text ||
    payload.output
      ?.flatMap((item) => item.content || [])
      .find((item) => item.type === "output_text")?.text;
  let output: unknown;
  try {
    output = JSON.parse(outputText || "null");
  } catch {
    throw new Error("The staff translation was invalid.");
  }
  const parsed = translationSchema.safeParse(output);
  if (!parsed.success) throw new Error("The staff translation was invalid.");
  return parsed.data.translatedText;
}
