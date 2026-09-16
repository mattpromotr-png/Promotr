import { z } from "zod";

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((value) => value || undefined);

const optionalUuid = z
  .union([z.string().uuid(), z.literal("")])
  .optional()
  .transform((value) => value || undefined);

export const lostFoundReportSchema = z.object({
  idempotencyKey: z.string().uuid(),
  conversationId: optionalUuid,
  name: z.string().trim().min(2, "Enter your full name.").max(100),
  phone: z.string().trim().min(7, "Enter a valid phone number.").max(30),
  email: z.string().trim().email("Enter a valid email address.").max(254),
  itemDescription: z
    .string()
    .trim()
    .min(3, "Describe the item you lost.")
    .max(1200),
  lostDate: z
    .string()
    .date("Choose the date the item was lost.")
    .refine(
      (value) => value <= new Date().toISOString().slice(0, 10),
      "The lost date cannot be in the future.",
    ),
  approximateLostTime: optionalText(10),
  lastKnownLocation: optionalText(200),
  consent: z
    .boolean()
    .refine(Boolean, "Consent is required so the venue can contact you."),
  website: z.string().max(0).optional(),
});

export type LostFoundReportInput = z.input<typeof lostFoundReportSchema>;
