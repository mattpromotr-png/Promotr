import { CalendarDays, Users } from "lucide-react";
import { notFound } from "next/navigation";
import { Brand } from "@/components/brand";
import { ManageInquiryForm } from "@/components/booking/manage-inquiry-form";
import { isValidInquiryManageToken } from "@/lib/bookings/manage-token";
import { createAdminClient } from "@/lib/supabase/admin";

export const metadata = { title: "Manage inquiry" };
export const dynamic = "force-dynamic";

export default async function ManageInquiryPage({ params, searchParams }: { params: Promise<{ leadId: string }>; searchParams: Promise<{ token?: string }> }) {
  const [{ leadId }, query] = await Promise.all([params, searchParams]);
  const token = query.token || "";
  if (!isValidInquiryManageToken(leadId, token)) notFound();
  const { data: lead } = await createAdminClient()
    .from("leads")
    .select("id,name,email,phone,requested_date,party_size,preferred_arrival_time,occasion,notes,booking_type")
    .eq("id", leadId)
    .maybeSingle();
  if (!lead || lead.booking_type === "table") notFound();
  return (
    <main className="relative min-h-svh overflow-hidden px-4 py-8 sm:py-12">
      <div className="ambient-glow" aria-hidden="true" />
      <section className="surface-card relative mx-auto max-w-3xl p-6 sm:p-10">
        <Brand compact />
        <p className="eyebrow mt-8">PRIVATE INQUIRY LINK</p>
        <h1 className="text-foreground mt-2 text-3xl font-semibold">Manage your inquiry</h1>
        <p className="text-muted mt-3 text-sm">Update your request before the venue confirms it. Keep this private link safe.</p>
        <div className="border-border bg-elevated mt-7 grid gap-4 rounded-2xl border p-5 sm:grid-cols-2">
          <p className="text-muted flex items-center gap-2 text-sm"><CalendarDays className="text-violet" size={17} /> {lead.requested_date}</p>
          <p className="text-muted flex items-center gap-2 text-sm"><Users className="text-violet" size={17} /> {lead.party_size} guests</p>
        </div>
        <ManageInquiryForm details={{ leadId, token, name: lead.name, email: lead.email || "", phone: lead.phone || "", requestedDate: lead.requested_date, partySize: lead.party_size, preferredArrivalTime: lead.preferred_arrival_time || "", occasion: lead.occasion || "", notes: lead.notes || "" }} />
      </section>
    </main>
  );
}
