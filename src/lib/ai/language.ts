export function normalizeLanguageName(language: string | null | undefined) {
  const value = language?.trim();
  return value &&
    value.toLowerCase() !== "unknown" &&
    /^[\p{L} .()\-]{2,60}$/u.test(value)
    ? value
    : "English";
}
