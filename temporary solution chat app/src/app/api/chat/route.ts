import { generateReply, toPublicReply } from "@/lib/ai";
import { chatRequestSchema } from "@/lib/contract";

export const dynamic = "force-dynamic";

const MAX_BODY_BYTES = 10_000;
const LIMIT = 20;
const WINDOW_MS = 60 * 60 * 1000;
const attempts = new Map<string, number[]>();

function limited(ip: string) {
  const now = Date.now();
  const recent = (attempts.get(ip) || []).filter(
    (time) => now - time < WINDOW_MS,
  );
  recent.push(now);
  attempts.set(ip, recent);
  return recent.length > LIMIT;
}

function json(body: object, status = 200) {
  return Response.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

export async function POST(request: Request) {
  const length = Number(request.headers.get("content-length") || 0);
  if (length > MAX_BODY_BYTES) return json({ error: "Invalid request." }, 413);

  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  if (limited(ip))
    return json({ error: "Please wait before trying again." }, 429);

  try {
    const result = chatRequestSchema.safeParse(await request.json());
    if (!result.success) return json({ error: "Invalid request." }, 400);
    const aiResult = await generateReply(result.data.messages.slice(-12));
    const bookingUrl = process.env.BOOKING_FORM_URL;
    if (!bookingUrl) return json({ error: "Chat is not configured." }, 503);
    return json(toPublicReply(aiResult, bookingUrl));
  } catch {
    return json({ error: "Unable to reply right now." }, 500);
  }
}
