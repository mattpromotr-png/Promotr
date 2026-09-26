type EmailLink = { label: string; url: string };

export function formatConciergeEmail(input: {
  reply: string;
  knownName?: string | null;
  language?: string | null;
  links?: EmailLink[];
}) {
  const name = input.knownName
    ?.replace(/[\r\n]+/g, " ")
    .trim()
    .slice(0, 80);
  const language = input.language?.toLowerCase() || "english";
  const greetings: Record<string, [string, string]> = {
    english: ["Hello", "Kind regards"],
    french: ["Bonjour", "Cordialement"],
    spanish: ["Hola", "Saludos cordiales"],
    german: ["Guten Tag", "Mit freundlichen Grüßen"],
    portuguese: ["Olá", "Atenciosamente"],
    italian: ["Buongiorno", "Cordiali saluti"],
  };
  const [greeting, closing] = greetings[language] || greetings.english;
  const body = input.reply
    .replace(
      /\p{Extended_Pictographic}(?:[\uFE0F\u200D]|\p{Emoji_Modifier})*/gu,
      "",
    )
    .replace(/\r/g, "")
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .join("\n\n");
  return [
    `${greeting}${name ? ` ${name}` : ""},`,
    body,
    ...(input.links || []).map((link) => `${link.label}: ${link.url}`),
    `${closing},\nVera\nAI Concierge | The Promotr Lounge`,
  ].join("\n\n");
}

export function renderEmailHtml(content: string) {
  const paragraphs = content.replace(/\r/g, "").split(/\n\s*\n/);
  const body = paragraphs
    .map((paragraph) => {
      const link = paragraph.match(/^([^:\n]{1,80}):\s*(https?:\/\/\S+)$/);
      const inner = link
        ? `<a href="${escapeHtml(link[2])}" style="color:#6d28d9;text-decoration:underline">${escapeHtml(link[1])}</a>`
        : paragraph
            .split(/(https?:\/\/[^\s<>]+)/g)
            .map((part, index) =>
              index % 2
                ? `<a href="${escapeHtml(part)}" style="color:#6d28d9;overflow-wrap:anywhere">${escapeHtml(part)}</a>`
                : escapeHtml(part).replace(/\n/g, "<br>"),
            )
            .join("");
      return `<p style="margin:0 0 16px">${inner}</p>`;
    })
    .join("");
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;padding:24px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.5;color:#202124"><div style="max-width:640px">${body}</div></body></html>`;
}

function escapeHtml(value: string) {
  return value.replace(
    /[&<>"']/g,
    (character) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[character]!,
  );
}
