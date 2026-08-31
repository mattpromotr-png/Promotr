import { z } from "zod";

export const aiHostResponseSchema = z
  .object({
    reply: z.string().trim().min(1).max(600),
    intent: z.enum([
      "faq",
      "guest_list",
      "table",
      "birthday",
      "complaint",
      "booking",
      "other",
    ]),
    bookingIntent: z.boolean(),
    missingQualificationFields: z
      .array(
        z.enum([
          "date",
          "party_size",
          "occasion",
          "booking_type",
          "bottle_preference",
        ]),
      )
      .max(5),
    shareBookingForm: z.boolean(),
    handoffRequired: z.boolean(),
    handoffReason: z.string().trim().max(300).nullable(),
  })
  .superRefine((value, context) => {
    if (value.handoffRequired && !value.handoffReason)
      context.addIssue({
        code: "custom",
        path: ["handoffReason"],
        message: "A handoff reason is required.",
      });
  });

export type AiHostResponse = z.infer<typeof aiHostResponseSchema>;

const falseConfirmationPattern =
  /\b(you(?:'re| are) booked|(?:booking|reservation|table)(?: is|'s)? confirmed|got you booked|secured your (?:table|booking|reservation))\b/i;

export function finalizeAiReply(
  response: AiHostResponse,
  bookingFormUrl: string,
) {
  const safeReply = response.reply.replace(/https?:\/\/\S+/gi, "").trim();
  if (falseConfirmationPattern.test(safeReply)) {
    return "I can help you send a booking inquiry, but the venue still needs to confirm availability. Want to continue?";
  }
  return response.shareBookingForm
    ? `${safeReply}\n\nSend your inquiry here: ${bookingFormUrl}`
    : safeReply;
}
