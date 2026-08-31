import { createHmac } from "node:crypto";

export function getRateLimitKey(headers: Headers, secret: string) {
  const forwarded = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const address = forwarded || headers.get("x-real-ip") || "unknown";
  return createHmac("sha256", secret).update(address).digest("hex");
}
