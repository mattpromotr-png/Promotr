import { loadEnvConfig } from "@next/env";
import { beforeAll, describe, expect, it } from "vitest";
import { triageIncomingEmail, type EmailTriageInput } from "./email-triage";

const live = process.env.RUN_LIVE_EMAIL_TRIAGE === "1";
const cases: Array<{ name: string; input: EmailTriageInput; route: string }> = [
  {
    name: "new guest booking",
    input: { sender: "guest@example.com", subject: "Friday table", body: "Hi, can I book a table at Promotr for Friday night?", priorThreadMessages: [] },
    route: "agent",
  },
  {
    name: "lost item",
    input: { sender: "guest2@example.com", subject: "Lost wallet", body: "I lost my wallet at Promotr last Saturday. What should I do?", priorThreadMessages: [] },
    route: "agent",
  },
  {
    name: "short related thread follow-up",
    input: { sender: "guest@example.com", subject: "Re: Friday table at Promotr", body: "What about Saturday?", priorThreadMessages: [{ direction: "inbound", content: "Can I book a Friday table?" }, { direction: "outbound", content: "What size is your party?" }] },
    route: "agent",
  },
  {
    name: "supplier sales pitch",
    input: { sender: "sales@vendor.example", subject: "Grow Promotr revenue", body: "We sell new POS terminals to nightclubs. Book a demo of our product this week.", priorThreadMessages: [] },
    route: "ignore",
  },
  {
    name: "DJ collaboration request",
    input: { sender: "dj@example.com", subject: "Perform at Promotr", body: "I'm a DJ and would like to perform at your club. Who handles bookings?", priorThreadMessages: [] },
    route: "review",
  },
  {
    name: "unclear personal email",
    input: { sender: "person@example.com", subject: "", body: "Hi Matt, about what we discussed yesterday?", priorThreadMessages: [] },
    route: "review",
  },
];

describe.skipIf(!live)("live Gmail triage with synthetic emails", () => {
  beforeAll(() => {
    loadEnvConfig(process.cwd());
    if (!process.env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY missing");
  });
  for (const scenario of cases) {
    it(scenario.name, async () => {
      const result = await triageIncomingEmail(scenario.input);
      expect(result.route).toBe(scenario.route);
    }, 30000);
  }
});
