import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(request: NextRequest) {
  const date = request.nextUrl.searchParams.get("date") || "";
  const excludeBookingId = request.nextUrl.searchParams.get("excludeBookingId");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date))
    return NextResponse.json({ unavailableTableIds: [] });
  let query = createAdminClient()
    .from("table_bookings")
    .select("table_id,status,hold_expires_at")
    .eq("booking_date", date)
    .in("status", ["held", "confirmed"]);
  if (excludeBookingId && /^[0-9a-f-]{36}$/i.test(excludeBookingId))
    query = query.neq("id", excludeBookingId);
  const { data, error } = await query;
  if (error)
    return NextResponse.json(
      { error: "Unable to load table availability." },
      { status: 500 },
    );
  const now = Date.now();
  return NextResponse.json({
    unavailableTableIds: (data ?? [])
      .filter(
        (item) =>
          item.status === "confirmed" ||
          (item.hold_expires_at &&
            new Date(item.hold_expires_at).getTime() > now),
      )
      .map((item) => item.table_id),
  });
}
