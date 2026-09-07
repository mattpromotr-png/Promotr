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
  updated_at?: string;
  booking_change_status?:
    "guest_updated" | "change_requested" | "admin_updated" | null;
  booking_changed_at?: string | null;
  booking_change_history?: {
    id: string;
    changed_by: "guest" | "admin";
    previous_values: Record<string, unknown>;
    new_values: Record<string, unknown>;
    created_at: string;
  }[];
  table_bookings?:
    | {
        id: string;
        status: string;
        paid_at: string | null;
        table_id: string;
        booking_date: string;
        deposit_cad: number;
        minimum_spend_cad: number;
        club_tables?: { name: string; code: string } | null;
      }
    | {
        id: string;
        status: string;
        paid_at: string | null;
        table_id: string;
        booking_date: string;
        deposit_cad: number;
        minimum_spend_cad: number;
        club_tables?: { name: string; code: string } | null;
      }[]
    | null;
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
