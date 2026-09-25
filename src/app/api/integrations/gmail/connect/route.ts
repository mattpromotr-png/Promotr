import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/auth/admin";
import { gmailAuthorizationUrl } from "@/lib/gmail/client";

export async function GET() {
  await requireAdmin();
  const state = randomBytes(24).toString("base64url");
  const cookieStore = await cookies();
  cookieStore.set("promotr_gmail_oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 10 * 60,
  });
  return NextResponse.redirect(gmailAuthorizationUrl(state));
}
