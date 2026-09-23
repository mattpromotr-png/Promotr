import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

type InstagramProfileResponse = {
  name?: unknown;
  username?: unknown;
};

export async function hydrateInstagramContactProfile(input: {
  contactId: string;
  instagramScopedId: string;
}) {
  const token = process.env.META_ACCESS_TOKEN;
  const version = process.env.META_GRAPH_API_VERSION;
  if (!token || !/^v\d+\.\d+$/.test(version || "")) return;
  if (!/^\d+$/.test(input.instagramScopedId)) return;

  try {
    const response = await fetch(
      `https://graph.instagram.com/${version}/${input.instagramScopedId}?fields=name,username`,
      {
        headers: { Authorization: `Bearer ${token}` },
        signal: AbortSignal.timeout(5_000),
        cache: "no-store",
      },
    );
    if (!response.ok) {
      console.warn("Instagram profile lookup was unavailable", {
        status: response.status,
      });
      return;
    }

    const profile = (await response.json()) as InstagramProfileResponse;
    const name =
      cleanProfileText(profile.name) || cleanProfileText(profile.username);
    if (!name) return;

    const { error } = await createAdminClient()
      .from("contacts")
      .update({ display_name: name })
      .eq("id", input.contactId)
      .is("display_name", null);
    if (error)
      console.warn("Unable to save Instagram profile name", {
        code: error.code,
      });
  } catch (error) {
    console.warn("Instagram profile lookup failed", {
      name: error instanceof Error ? error.name : "UnknownError",
    });
  }
}

function cleanProfileText(value: unknown) {
  return typeof value === "string" ? value.trim().slice(0, 100) : "";
}
