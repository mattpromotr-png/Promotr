import { z } from "zod";

const serverEnvironmentSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  ADMIN_EMAIL: z.string().email(),
  LEAD_RATE_LIMIT_SECRET: z.string().min(32),
});

export function getServerEnvironment() {
  const result = serverEnvironmentSchema.safeParse(process.env);
  if (!result.success)
    throw new Error(
      "Required server environment variables are missing or invalid.",
    );
  return result.data;
}
