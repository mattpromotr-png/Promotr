import { NextResponse, type NextRequest } from "next/server";

import { getServerEnvironment } from "@/lib/env/server";
import { getRateLimitKey } from "@/lib/security/request-key";
import { createAdminClient } from "@/lib/supabase/admin";
import { lostFoundReportSchema } from "@/lib/validation/lost-found";

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Check the form and try again." },
      { status: 400 },
    );
  }
  const result = lostFoundReportSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json(
      {
        error: "Check the highlighted fields and try again.",
        fields: result.error.flatten().fieldErrors,
      },
      { status: 422 },
    );
  }
  if (result.data.website) return NextResponse.json({ received: true });

  try {
    const environment = getServerEnvironment();
    const { data, error } = await createAdminClient().rpc(
      "submit_lost_found_report",
      {
        p_idempotency_key: result.data.idempotencyKey,
        p_rate_limit_key: getRateLimitKey(
          request.headers,
          environment.LEAD_RATE_LIMIT_SECRET,
        ),
        p_payload: {
          conversation_id: result.data.conversationId ?? null,
          name: result.data.name,
          phone: result.data.phone,
          email: result.data.email,
          item_description: result.data.itemDescription,
          lost_date: result.data.lostDate,
          approximate_lost_time: result.data.approximateLostTime ?? null,
          last_known_location: result.data.lastKnownLocation ?? null,
        },
      },
    );
    if (error) {
      if (error.message.includes("rate_limit_exceeded")) {
        return NextResponse.json(
          { error: "Too many attempts. Please try again later." },
          { status: 429 },
        );
      }
      throw error;
    }
    return NextResponse.json(
      { received: true, reportId: data },
      { status: 201 },
    );
  } catch (error) {
    console.error("Lost and found submission failed", {
      name: error instanceof Error ? error.name : "UnknownError",
    });
    return NextResponse.json(
      {
        error:
          "We couldn't send your report right now. Please try again shortly.",
      },
      { status: 500 },
    );
  }
}
