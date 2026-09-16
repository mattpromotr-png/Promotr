import { z } from "zod";

export const conciergeIntelligenceSchema = z.object({
  detectedLanguage: z
    .string()
    .trim()
    .min(1)
    .max(60)
    .regex(/^[\p{L} .()\-]+$/u),
  latestGuestMessageEnglish: z.string().trim().min(1).max(1200),
  replyEnglish: z.string().trim().min(1).max(1200),
  guestFirstName: z.string().trim().min(1).max(80).nullable(),
  memoryFacts: z.array(z.string().trim().min(1).max(180)).max(8),
  conversationSummary: z.string().trim().min(1).max(600),
});

export type ConciergeIntelligence = z.infer<typeof conciergeIntelligenceSchema>;
