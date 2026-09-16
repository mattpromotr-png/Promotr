const bookingRequestPattern =
  /\b(?:i\s+)?(?:need|want|would like|ready|trying)\s+to\s+(?:book|reserve|join)|\bhow\s+(?:can|do)\s+i\s+(?:book|reserve|join)|\b(?:book|reserve)\s+(?:a\s+)?(?:party|table)|\bjoin\s+(?:the\s+)?guest\s+list|\b(?:booking|reservation)\s+(?:form|link)\b|\b(?:send|share|give)\b.{0,30}\b(?:booking|reservation|form|link)\b|(?:බුකිං|බුක්).{0,24}(?:ලින්ක්|ෆෝම්|කරන්න|ඕන|අවශ්‍ය)/iu;

export function latestMessageAllowsBookingLink(message: string) {
  return bookingRequestPattern.test(message);
}

const bookingLinkRepeatPattern =
  /\b(send|share|give)\b.{0,24}\b(again|another|link|form)\b|\b(link|form)\b.{0,24}\b(again|please)\b/i;

export function conversationAllowsBookingLink(
  messages: Array<{ role: "user" | "assistant"; content: string }>,
) {
  const latest = messages.at(-1);
  if (!latest || latest.role !== "user") return false;
  if (!latestMessageAllowsBookingLink(latest.content)) return false;
  if (bookingLinkRepeatPattern.test(latest.content)) return true;
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
