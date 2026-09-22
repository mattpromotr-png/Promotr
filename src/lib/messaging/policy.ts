const bookingRequestPattern =
  /\b(?:i|we)(?:'d)?\s+(?:need|want|like|ready|trying)\s+to\s+(?:book|reserve|join)\b|\b(?:i|we)\s+would\s+like\s+to\s+(?:book|reserve|join)\b|\b(?:how|where)\s+(?:can|do)\s+(?:i|we)\s+(?:book|reserve|join)\b|\b(?:can|could)\s+(?:i|we)\s+(?:book|reserve|join)\b|\bcan\s+you\s+(?:help\s+(?:me|us)\s+)?(?:book|reserve)\b|\b(?:book|reserve)\s+(?:me|us|a\s+party|a\s+table)\b|\bjoin\s+(?:the\s+)?guest\s*list\b|(?:බුකිං|බුක්).{0,24}(?:ලින්ක්|ෆෝම්|කරන්න|ඕන|අවශ්‍ය)/iu;

const explicitBookingLinkRequestPattern =
  /\b(?:send|share|give|show|need|want|get|find|where|resend|please)\b.{0,50}\b(?:booking|reservation|book|reserve)\b.{0,30}\b(?:link|form|url|page)\b|\b(?:send|share|give|show|need|want|get|find|where|resend|please)\b.{0,50}\b(?:link|form|url|page)\b.{0,30}\b(?:book|reserve|booking|reservation)\b|\bdo\s+you\s+have\b.{0,30}\b(?:booking|reservation)\b.{0,30}\b(?:link|form|url|page)\b|\b(?:booking|reservation)\s+(?:link|form|url|page)\s*(?:please|again|\?)|^\s*(?:booking|reservation)\s+(?:link|form|url|page)\s*$/i;

export function latestMessageAllowsBookingLink(message: string) {
  return (
    bookingRequestPattern.test(message) ||
    explicitBookingLinkRequestPattern.test(message)
  );
}

const bookingLinkRepeatPattern =
  /\b(send|share|give)\b.{0,24}\b(again|another|link|form)\b|\b(link|form)\b.{0,24}\b(again|please)\b/i;

export function conversationAllowsBookingLink(
  messages: Array<{ role: "user" | "assistant"; content: string }>,
) {
  const latest = messages.at(-1);
  if (!latest || latest.role !== "user") return false;
  if (!latestMessageAllowsBookingLink(latest.content)) return false;
  if (
    bookingLinkRepeatPattern.test(latest.content) ||
    explicitBookingLinkRequestPattern.test(latest.content)
  )
    return true;
  return !messages
    .slice(-6, -1)
    .some(
      (message) =>
        message.role === "assistant" &&
        (/https?:\/\/\S+\/book\b/i.test(message.content) ||
          /\bbooking inquiry\b/i.test(message.content)),
    );
}

const lostItemPattern =
  /\b(?:lost|missing|misplaced|left|forgot|find|found)\b.{0,60}\b(?:phone|watch|wallet|purse|bag|keys?|jacket|coat|card|id|ring|earrings?|necklace|bracelet|glasses|item|belongings?)\b|\b(?:lost and found|lost item|missing item)\b/iu;
const lostFormRepeatPattern =
  /\b(?:send|share|give)\b.{0,30}\b(?:lost|form|link)\b|\b(?:form|link)\b.{0,24}\b(?:again|please)\b/iu;

export function latestMessageNeedsLostFoundForm(message: string) {
  return lostItemPattern.test(message);
}

export function conversationNeedsLostFoundForm(
  messages: Array<{ role: "user" | "assistant"; content: string }>,
) {
  const latest = messages.at(-1);
  if (!latest || latest.role !== "user") return false;
  if (!latestMessageNeedsLostFoundForm(latest.content)) return false;
  if (lostFormRepeatPattern.test(latest.content)) return true;
  return !messages
    .slice(-6, -1)
    .some(
      (message) =>
        message.role === "assistant" &&
        (/https?:\/\/\S+\/lost-found\b/i.test(message.content) ||
          /lost-item report/i.test(message.content)),
    );
}

const directStaffRequestPattern =
  /\b(?:speak|talk|chat|connect|contact|transfer|pass me|put me through)\b.{0,40}\b(?:human|person|someone|staff|team|manager|admin|owner)\b|\b(?:human|staff|manager|admin)\b.{0,30}\b(?:please|now|directly|contact|help|reply|call)\b/iu;
const urgentAttentionPattern =
  /\b(?:urgent|urgently|emergency|immediately|asap|right now|unsafe|danger|threat|injured|medical|police|security|charged twice|double charged|refund|complaint)\b/iu;

export function requiresStaffAttention(message: string) {
  return (
    directStaffRequestPattern.test(message) ||
    urgentAttentionPattern.test(message)
  );
}
