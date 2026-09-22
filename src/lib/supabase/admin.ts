import { createClient } from "@supabase/supabase-js";
import { getServerEnvironment } from "@/lib/env/server";

export function createAdminClient(options?: { logSlowQueries?: boolean }) {
  const environment = getServerEnvironment();
  return createClient(
    environment.NEXT_PUBLIC_SUPABASE_URL,
    environment.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: { autoRefreshToken: false, persistSession: false },
      ...(options?.logSlowQueries && {
        global: {
          fetch: async (input: RequestInfo | URL, init?: RequestInit) => {
            const startedAt = performance.now();
            try {
              return await fetch(input, init);
            } finally {
              const durationMs = Math.round(performance.now() - startedAt);
              if (durationMs >= 500) {
                const url =
                  typeof input === "string"
                    ? input
                    : input instanceof URL
                      ? input.href
                      : input.url;
                // Exclude URL parameters: filters can contain guest data.
                console.info("Slow admin database request", {
                  resource: new URL(url).pathname,
                  durationMs,
                });
              }
            }
          },
        },
      }),
    },
  );
}
