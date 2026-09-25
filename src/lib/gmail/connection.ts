import "server-only";

import { refreshGmailAccessToken } from "@/lib/gmail/client";
import { decryptGmailToken } from "@/lib/gmail/token-crypto";
import { createAdminClient } from "@/lib/supabase/admin";

export type GmailConnection = {
  id: string;
  venue_id: string;
  email_address: string;
  encrypted_refresh_token: string;
  history_id: string | null;
  watch_expiration: string | null;
  status: string;
};

export async function loadGmailConnection(venueId?: string) {
  let query = createAdminClient()
    .from("gmail_connections")
    .select(
      "id,venue_id,email_address,encrypted_refresh_token,history_id,watch_expiration,status",
    )
    .in("status", ["connected", "error"]);
  if (venueId) query = query.eq("venue_id", venueId);
  const { data, error } = await query.limit(1).maybeSingle();
  if (error || !data) throw new Error("Gmail is not connected.");
  return data as GmailConnection;
}

export async function gmailAccessToken(connection: GmailConnection) {
  return refreshGmailAccessToken(
    decryptGmailToken(connection.encrypted_refresh_token),
  );
}
