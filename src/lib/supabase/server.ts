import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getServerEnvironment } from "@/lib/env/server";

export async function createUserClient() {
  const environment = getServerEnvironment();
  const cookieStore = await cookies();
  return createServerClient(
    environment.NEXT_PUBLIC_SUPABASE_URL,
    environment.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            /* Proxy refreshes Server Component sessions. */
          }
        },
      },
    },
  );
}
