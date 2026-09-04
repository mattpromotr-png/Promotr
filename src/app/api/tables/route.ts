import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(request: NextRequest) {
  const date = request.nextUrl.searchParams.get("date") || "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date))
    return NextResponse.json({ unavailableTableIds: [] });
  const { data, error } = await createAdminClient()
    .from("table_bookings")
    .select("table_id,status,hold_expires_at")
    .eq("booking_date", date)
    .in("status", ["held", "confirmed"]);
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
