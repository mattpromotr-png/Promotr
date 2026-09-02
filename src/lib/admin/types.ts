export type LeadStatus = "new" | "contacted" | "qualified" | "closed";
export type BookingType = "guest_list" | "table" | "unsure";

export type AdminLead = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  instagram_handle: string | null;
  requested_date: string;
  preferred_arrival_time: string | null;
  party_size: number;
  occasion: string | null;
  booking_type: BookingType;
  bottle_preference: string | null;
  notes: string | null;
  status: LeadStatus;
  created_at: string;
  conversations: { status: string; handoff_reason: string | null } | null;
};
