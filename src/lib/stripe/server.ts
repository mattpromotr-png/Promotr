import "server-only";
import Stripe from "stripe";
import { z } from "zod";

const stripeEnvironmentSchema = z.object({
  STRIPE_SECRET_KEY: z.string().startsWith("sk_"),
  STRIPE_WEBHOOK_SECRET: z.string().startsWith("whsec_"),
  NEXT_PUBLIC_APP_URL: z.string().url(),
});

export function getStripeEnvironment() {
  return stripeEnvironmentSchema.parse(process.env);
}

export function createStripeClient() {
  return new Stripe(getStripeEnvironment().STRIPE_SECRET_KEY);
}
