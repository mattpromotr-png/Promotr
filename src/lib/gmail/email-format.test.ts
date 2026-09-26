import { describe, expect, it } from "vitest";

import { formatConciergeEmail, renderEmailHtml } from "./email-format";
import { buildReplyMime } from "@/lib/messaging/email-conversation";

describe("email presentation", () => {
  it("adds a greeting and signature and reflows paragraphs", () => {
    const content = formatConciergeEmail({
      knownName: "Angela",
      reply: "We can help with your\nbooking. 🍾\n\nHow many guests?",
      links: [
        { label: "Booking inquiry", url: "https://example.com/book?id=1" },
      ],
    });
    expect(content).toContain(
      "Hello Angela,\n\nWe can help with your booking.",
    );
    expect(content).toContain("\n\nHow many guests?\n\nBooking inquiry:");
    expect(content).toContain(
      "Kind regards,\nVera\nAI Concierge | The Promotr Lounge",
    );
    expect(content).not.toContain("🍾");
  });

  it("escapes HTML and renders a labeled booking link", () => {
    const html = renderEmailHtml(
      "<script>bad</script>\n\nBooking inquiry: https://example.com/book?a=1&b=2",
    );
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
    expect(html).toContain('href="https://example.com/book?a=1&amp;b=2"');
    expect(html).toContain(">Booking inquiry</a>");
  });

  it.each(["guest@hotmail.com", "guest@outlook.com", "guest@example.org"])(
    "builds multipart replies to %s",
    (to) => {
      const mime = buildReplyMime({
        from: "matt.promotr@gmail.com",
        to,
        subject: "Inquiry",
        content: "Hello,\n\nThank you for your inquiry.",
      });
      expect(mime).toContain(`To: ${to}`);
      expect(mime).toContain("multipart/alternative");
      expect(mime).toContain('text/plain; charset="UTF-8"');
      expect(mime).toContain('text/html; charset="UTF-8"');
      const parts = [
        ...mime.matchAll(
          /Content-Transfer-Encoding: base64\r\n\r\n([\s\S]*?)\r\n--/g,
        ),
      ];
      expect(parts).toHaveLength(2);
      expect(
        Buffer.from(parts[0][1].replace(/\s/g, ""), "base64").toString(),
      ).toContain("Thank you for your inquiry.");
      expect(
        Buffer.from(parts[1][1].replace(/\s/g, ""), "base64").toString(),
      ).toContain("<p");
    },
  );
});
