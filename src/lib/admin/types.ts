export type LeadStatus = "new" | "contacted" | "pending" | "booked";
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
  confirmed_revenue_cad: number | null;
  booked_at: string | null;
  conversations: {
    id: string;
    status: string;
    handoff_reason: string | null;
    channel: string;
    human_takeover: boolean;
    messages?: {
      id: string;
      sender_type: "guest" | "ai" | "human";
      content: string;
      metadata: {
        englishTranslation?: string;
        detectedLanguage?: string;
        adminOriginalEnglish?: string;
      } | null;
      created_at: string;
    }[];
  } | null;
};
