import { CalendarDays, Clock3, ShieldCheck, Users } from "lucide-react";
import { notFound } from "next/navigation";
import { Brand } from "@/components/brand";
import { ManageBookingForm } from "@/components/booking/manage-booking-form";
import { isValidBookingManageToken } from "@/lib/bookings/manage-token";
import { createAdminClient } from "@/lib/supabase/admin";

export const metadata = { title: "Manage booking" };
export const dynamic = "force-dynamic";

export default async function ManageBookingPage({
  params,
  searchParams,
}: {
  params: Promise<{ bookingId: string }>;
  searchParams: Promise<{ token?: string }>;
}) {
  const [{ bookingId }, query] = await Promise.all([params, searchParams]);
  const token = query.token || "";
  if (!isValidBookingManageToken(bookingId, token)) notFound();
  const admin = createAdminClient();
  const { data: booking } = await admin
    .from("table_bookings")
    .select(
      "id,lead_id,table_id,booking_date,status,minimum_spend_cad,deposit_cad,club_tables(name,zone,capacity)",
    )
    .eq("id", bookingId)
    .maybeSingle();
  if (!booking) notFound();
  const { data: lead } = await admin
    .from("leads")
    .select("name,email,phone,party_size,preferred_arrival_time,occasion,notes")
    .eq("id", booking.lead_id)
    .maybeSingle();
  if (!lead) notFound();
  const table = booking.club_tables as unknown as {
    name: string;
    zone: string;
    capacity: number;
  } | null;
  const inactive = ["cancelled", "refunded", "expired"].includes(
    booking.status,
  );

  return (
    <main className="relative min-h-svh overflow-hidden px-4 py-8 sm:py-12">
      <div className="ambient-glow" />
      <section className="surface-card relative mx-auto max-w-3xl p-6 sm:p-10">
        <Brand compact />
        <p className="eyebrow mt-8">PRIVATE BOOKING LINK</p>
        <h1 className="text-foreground mt-2 text-3xl font-semibold">
          Manage your booking
        </h1>
        <p className="text-muted mt-3 text-sm">
          Keep this page private. Anyone with this link can manage this
          reservation.
        </p>
        <div className="border-border bg-elevated mt-7 grid gap-4 rounded-2xl border p-5 sm:grid-cols-4">
          <Summary
            icon={<CalendarDays />}
            label="Date"
            value={booking.booking_date}
          />
          <Summary
            icon={<Users />}
            label="Party"
            value={`${lead.party_size} guests`}
          />
          <Summary
            icon={<ShieldCheck />}
            label="Table"
            value={table?.name || "Table"}
          />
          <Summary icon={<Clock3 />} label="Status" value={booking.status} />
        </div>
        <section className="mt-5 rounded-2xl border border-violet-400/25 bg-violet-400/10 p-5 text-sm">
          <h2 className="text-foreground font-semibold">
            Demo cancellation policy
          </h2>
          <p className="text-muted mt-2 leading-6">
            Cancel at least 48 hours before the booking date for an automatic
            deposit refund. Later cancellations and no-shows are non-refundable.
            Cancelling always releases the complete table.
          </p>
        </section>
        {inactive ? (
          <p className="mt-7 rounded-xl border border-amber-400/30 bg-amber-400/10 p-4 text-sm text-amber-100">
            This booking is {booking.status} and can no longer be changed.
          </p>
        ) : (
          <ManageBookingForm
            details={{
              bookingId,
              token,
              bookingDate: booking.booking_date,
              tableId: booking.table_id,
              depositCad: Number(booking.deposit_cad),
              name: lead.name,
              email: lead.email || "",
              phone: lead.phone || "",
              partySize: lead.party_size,
              preferredArrivalTime: lead.preferred_arrival_time || "",
              occasion: lead.occasion || "",
              notes: lead.notes || "",
            }}
          />
        )}
      </section>
    </main>
  );
}

function Summary({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="text-muted text-xs">
      <span className="text-violet flex items-center gap-1.5 [&>svg]:size-4">
        {icon}
        {label}
      </span>
      <p className="text-foreground mt-2 font-medium capitalize">{value}</p>
    </div>
  );
}
