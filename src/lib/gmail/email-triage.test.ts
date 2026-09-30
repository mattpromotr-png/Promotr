import { afterEach, describe, expect, it, vi } from "vitest";
import { isSystemSender, triageIncomingEmail } from "./email-triage";

const guest = {
  sender: "new.guest@gmail.com",
  subject: "Friday table",
  body: "Can I book a table for Friday?",
  priorThreadMessages: [],
};

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

describe("Gmail reply gate", () => {
  it("ignores Google and no-reply senders without blocking Gmail guests", async () => {
    expect(isSystemSender("no-reply@accounts.google.com")).toBe(true);
    expect(isSystemSender("google-noreply@google.com")).toBe(true);
    expect(isSystemSender("noreply@some-service.example")).toBe(true);
    expect(isSystemSender("new.guest@gmail.com")).toBe(false);
    const fetchMock = vi.spyOn(globalThis, "fetch");
    expect(
      await triageIncomingEmail({
        ...guest,
        sender: "no-reply@accounts.google.com",
      }),
    ).toMatchObject({ route: "ignore" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("routes refunds, cancellations, safety and privacy requests to staff before AI", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch");
    for (const body of [
      "I was charged twice",
      "Please cancel my reservation",
      "A guest was injured",
      "Please delete my data",
      "Stop emailing me",
      "Someone threatened me with a knife",
    ]) {
      expect(await triageIncomingEmail({ ...guest, body })).toMatchObject({
        route: "review",
      });
    }
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("classifies sender, subject, body and same-thread history using a bounded structured response", async () => {
    vi.stubEnv("OPENAI_API_KEY", "test-key");
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(
        new Response(
          JSON.stringify({
            output_text: JSON.stringify({
              route: "agent",
              reason: "Club booking question",
            }),
          }),
          { status: 200 },
        ),
      );
    const result = await triageIncomingEmail({
      ...guest,
      subject: "Re: Friday table",
      body: "What about Saturday?",
      priorThreadMessages: [
        { direction: "outbound", content: "Friday tables require an inquiry." },
      ],
    });
    expect(result.route).toBe("agent");
    const payload = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body));
    expect(payload.text.format).toMatchObject({
      type: "json_schema",
      strict: true,
    });
    expect(payload.input[1].content).toContain("What about Saturday?");
    expect(payload.input[1].content).toContain("Re: Friday table");
    expect(payload.input[1].content).toContain("new.guest@gmail.com");
    expect(payload.input[1].content).toContain(
      "Friday tables require an inquiry.",
    );
  });

  it("accepts an ignore decision and fails safely to staff review on bad model output", async () => {
    vi.stubEnv("OPENAI_API_KEY", "test-key");
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            output_text: JSON.stringify({
              route: "ignore",
              reason: "Sales pitch",
            }),
          }),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(new Response("{}", { status: 503 }));
    expect(
      await triageIncomingEmail({
        ...guest,
        subject: "SEO services",
        body: "Buy my services",
      }),
    ).toMatchObject({ route: "ignore" });
    expect(await triageIncomingEmail(guest)).toMatchObject({
      route: "review",
      reason: "Email classification unavailable",
    });
  });
});
