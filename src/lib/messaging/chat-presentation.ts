// A narrow presentation guard for repeated English name salutations. Keep
// first-turn greetings and other languages intact; the prompt handles those.
export function removeRepeatedNameGreeting(
  reply: string,
  knownName: string | null | undefined,
  continuing: boolean,
) {
  if (!continuing || !knownName?.trim()) return reply;
  const firstName = knownName.trim().split(/\s+/)[0];
  const escaped = firstName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const salutation = new RegExp(
    `^\\s*(?:hey|hi|hello)[,\\s]+${escaped}\\s*[!,.:]\\s*`,
    "i",
  );
  const body = reply.replace(salutation, "");
  return body.trim() ? body : reply;
}
