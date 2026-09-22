import { afterEach, describe, expect, it, vi } from "vitest";

import { translateStaffReply } from "./translate-staff-reply";

const originalKey = process.env.OPENAI_API_KEY;

afterEach(() => {
  process.env.OPENAI_API_KEY = originalKey;
  vi.unstubAllGlobals();
});

describe("staff reply translation", () => {
  it("does not call the API for English", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    expect(await translateStaffReply("Hello", "English")).toBe("Hello");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("reads structured text from the REST Responses output array", async () => {
    process.env.OPENAI_API_KEY = "test-key";
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          output: [
            {
              type: "message",
              content: [
                {
                  type: "output_text",
                  text: JSON.stringify({ translatedText: "Hola" }),
                },
              ],
            },
          ],
        }),
      }),
    );

    expect(await translateStaffReply("Hello", "Spanish")).toBe("Hola");
  });

  it("fails clearly instead of sending unparsed text", async () => {
    process.env.OPENAI_API_KEY = "test-key";
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ output: [] }),
      }),
    );

    await expect(translateStaffReply("Hello", "Spanish")).rejects.toThrow(
      "The staff translation was invalid.",
    );
  });
});
