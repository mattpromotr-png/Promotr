import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
  const startedAt = performance.now();
  const response = NextResponse.next({ request });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return response;
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value),
        );
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });
  // The page still checks the current user and staff access. Proxy only needs
  // verified claims to refresh an expiring SSR session before page rendering.
  await supabase.auth.getClaims();
  const durationMs = Math.round(performance.now() - startedAt);
  if (durationMs >= 500) {
    console.info("Slow admin session refresh", {
      path: request.nextUrl.pathname,
      durationMs,
    });
  }
  return response;
}

export const config = { matcher: ["/admin/:path*"] };
