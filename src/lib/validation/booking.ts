import { z } from "zod";

export const bookingTypes = ["guest_list", "table", "unsure"] as const;

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((value) => value || undefined);

export const bookingInquirySchema = z
  .object({
    idempotencyKey: z.string().uuid(),
    name: z.string().trim().min(2, "Enter your full name.").max(100),
    email: z
      .union([
        z.string().trim().email("Enter a valid email address."),
        z.literal(""),
      ])
      .optional()
      .transform((value) => value || undefined),
    phone: optionalText(30),
    instagramHandle: optionalText(50),
    requestedDate: z
      .string()
      .date("Choose a valid date.")
      .refine(
        (value) => new Date(`${value}T23:59:59`) > new Date(),
        "Choose a future date.",
      ),
    preferredArrivalTime: optionalText(10),
    partySize: z
      .number()
      .int()
      .min(1, "Enter at least 1 guest.")
      .max(100, "For groups over 100, contact the venue directly."),
    occasion: optionalText(100),
    bookingType: z.enum(bookingTypes, {
      message: "Choose a booking preference.",
    }),
    bottlePreference: optionalText(200),
    notes: optionalText(1000),
    consent: z
      .boolean()
      .refine(Boolean, "Consent is required so the venue can contact you."),
    website: z.string().max(0).optional(),
  })
  .superRefine((data, context) => {
    if (!data.email && !data.phone) {
      const message = "Enter an email address or phone number.";
      context.addIssue({ code: "custom", path: ["email"], message });
      context.addIssue({ code: "custom", path: ["phone"], message });
    }
    if (data.bookingType === "table" && !data.bottlePreference) {
      context.addIssue({
        code: "custom",
        path: ["bottlePreference"],
        message: "Tell us your bottle preference, or enter “Not sure”.",
      });
    }
  });

export type BookingInquiryInput = z.input<typeof bookingInquirySchema>;
export type BookingInquiry = z.output<typeof bookingInquirySchema>;
