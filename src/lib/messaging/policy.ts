const bookingRequestPattern =
  /\b(?:i\s+)?(?:need|want|would like|ready|trying)\s+to\s+(?:book|reserve|join)|\bhow\s+(?:can|do)\s+i\s+(?:book|reserve|join)|\b(?:book|reserve)\s+(?:a\s+)?(?:party|table)|\bjoin\s+(?:the\s+)?guest\s+list|\b(?:booking|reservation)\s+(?:form|link)\b|\b(?:send|share|give)\b.{0,30}\b(?:booking|reservation|form|link)\b|(?:බුකිං|බුක්).{0,24}(?:ලින්ක්|ෆෝම්|කරන්න|ඕන|අවශ්‍ය)/iu;

export function latestMessageAllowsBookingLink(message: string) {
  return bookingRequestPattern.test(message);
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
