import { afterEach, describe, expect, it, vi } from "vitest";
import { groundVenueReply } from "./grounding";

afterEach(() => vi.unstubAllGlobals());

describe("independent venue grounding", () => {
  const input = {
    question: "Free pizza still available?",
    reply: "Yes, free pizza every Wednesday from 10 PM to 3 AM!",
    replyEnglish: "Yes, free pizza every Wednesday from 10 PM to 3 AM!",
    language: "English",
    sources: "Full bar and food. No published offers.",
    sourcesLoaded: true,
    email: false,
  };
  it("uses current sources separately from a stale candidate and applies the correction", async () => {
    const corrected = {
      reply: "There is no current free pizza offer.",
      replyEnglish: "There is no current free pizza offer.",
      corrected: true,
    };
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({
              output: [
                {
                  content: [
                    { type: "output_text", text: JSON.stringify(corrected) },
                  ],
                },
              ],
            }),
          ),
      ),
    );
    expect(await groundVenueReply(input)).toEqual(corrected);
    const request = JSON.parse(String(vi.mocked(fetch).mock.calls[0][1]?.body));
    expect(request.input[0].content).toContain(
      "complete current approved offer catalogue",
    );
    const context = JSON.parse(request.input[1].content);
    expect(context.approvedSources).not.toContain("Wednesday");
    expect(context.sourcesLoaded).toBe(true);
    expect(context).not.toHaveProperty("summary");
    expect(context).not.toHaveProperty("memory");
    expect(request.input[0].content).toContain("Promotr-only scope");
    expect(request.input[0].content).toContain("do not start every reply");
    expect(request.input[0].content).toContain("never name, recommend, link to");
    expect(request.input[0].content).toContain("calendar establishes dates");
    expect(request.input[0].content).toContain("latest guest correction wins");
    expect(request.input[0].content).toContain(
      "Do not invent positive alternatives",
    );
  });
  it("rejects unavailable or malformed verification rather than accepting the draft", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(null, { status: 503 })),
    );
    await expect(groundVenueReply(input)).rejects.toThrow();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify({ output: [] }))),
    );
    await expect(groundVenueReply(input)).rejects.toThrow();
  });

  it.each([false, true])(
    "preserves fact rules with channel-appropriate warmth (email=%s)",
    async (email) => {
      vi.stubGlobal(
        "fetch",
        vi.fn(
          async () =>
            new Response(
              JSON.stringify({
                output: [
                  {
                    content: [
                      {
                        type: "output_text",
                        text: JSON.stringify({
                          reply: "No current pizza offer.",
                          replyEnglish: "No current pizza offer.",
                          corrected: true,
                        }),
                      },
                    ],
                  },
                ],
              }),
            ),
        ),
      );
      await groundVenueReply({ ...input, email });
      const body = JSON.parse(String(vi.mocked(fetch).mock.calls[0][1]?.body));
      const instructions = body.input[0].content;
      expect(instructions).toContain("never invent a perk");
      expect(instructions).toContain(
        "complete current approved offer catalogue",
      );
      expect(instructions).toContain("Do not add a booking pitch");
      expect(instructions).toContain(
        email
          ? "EMAIL STYLE: warm and professional"
          : "CHAT STYLE (SMS/Instagram)",
      );
      expect(instructions).toContain(
        email ? "Avoid slang, emojis" : "An occasional fitting emoji",
      );
      expect(instructions).not.toContain(
        email
          ? "CHAT STYLE (SMS/Instagram)"
          : "EMAIL STYLE: warm and professional",
      );
    },
  );
});
