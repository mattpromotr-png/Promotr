import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";

import { requireAdmin } from "@/lib/auth/admin";
import {
  exchangeGmailCode,
  getGmailProfile,
  startGmailWatch,
} from "@/lib/gmail/client";
import { encryptGmailToken } from "@/lib/gmail/token-crypto";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(request: NextRequest) {
  await requireAdmin();
  const settingsUrl = new URL("/admin/settings", request.url);
  const cookieStore = await cookies();
  const expectedState = cookieStore.get("promotr_gmail_oauth_state")?.value;
  cookieStore.delete("promotr_gmail_oauth_state");
  const state = request.nextUrl.searchParams.get("state");
  const code = request.nextUrl.searchParams.get("code");
  if (!expectedState || state !== expectedState || !code) {
    settingsUrl.searchParams.set("gmail", "invalid_authorization");
    return NextResponse.redirect(settingsUrl);
  }

  try {
    const tokens = await exchangeGmailCode(code);
    if (!tokens.refresh_token)
      throw new Error("Google did not provide long-term access.");
    const profile = await getGmailProfile(tokens.access_token);
    const expectedAddress =
      process.env.GMAIL_EXPECTED_ADDRESS?.trim().toLowerCase();
    if (
      expectedAddress &&
      profile.emailAddress.trim().toLowerCase() !== expectedAddress
    )
      throw new Error("A different Gmail account was selected.");
    const admin = createAdminClient();
    const { data: venue } = await admin
      .from("venues")
      .select("id")
      .eq("slug", "promotr-nightclub")
      .single();
    if (!venue) throw new Error("Venue is unavailable.");
    const watch = await startGmailWatch(tokens.access_token);
    const { error } = await admin.from("gmail_connections").upsert(
      {
        venue_id: venue.id,
        email_address: profile.emailAddress.toLowerCase(),
        encrypted_refresh_token: encryptGmailToken(tokens.refresh_token),
        granted_scopes: (tokens.scope || "").split(" ").filter(Boolean),
        history_id: watch?.historyId || profile.historyId,
        watch_expiration: watch
          ? new Date(Number(watch.expiration)).toISOString()
          : null,
        status: "connected",
        last_error: null,
        last_synced_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "venue_id" },
    );
    if (error) throw new Error("Unable to save the Gmail connection.");
    settingsUrl.searchParams.set("gmail", "connected");
  } catch (error) {
    console.error("Gmail connection failed", {
      reason: error instanceof Error ? error.message : "unknown_error",
    });
    settingsUrl.searchParams.set("gmail", "connection_failed");
  }
  return NextResponse.redirect(settingsUrl);
}
