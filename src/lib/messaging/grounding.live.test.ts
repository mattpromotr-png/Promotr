import { describe, expect, it } from "vitest";
import { groundVenueReply } from "./grounding";

// Explicit opt-in only: uses paid API calls with synthetic data, no database.
const enabled = process.env.RUN_LIVE_GROUNDING === "1";
if (enabled) process.loadEnvFile(".env");

describe.skipIf(!enabled)("live venue grounding with synthetic offers", () => {
  const candidate = {
    question: "Is the free pizza offer still available?",
    reply:
      "Yes, free pizza every Wednesday from 10 PM to 3 AM for first guests!",
    replyEnglish:
      "Yes, free pizza every Wednesday from 10 PM to 3 AM for first guests!",
    language: "English",
    sourcesLoaded: true,
    email: false,
  };
  it("corrects historical pizza terms when current sources contain no offer", async () => {
    const result = await groundVenueReply({
      ...candidate,
      sources:
        "Full bar and food are available. Regular hours Thursday-Saturday 10 PM-3 AM. No published offers.",
    });
    expect(result.corrected).toBe(true);
    expect(result.replyEnglish).toMatch(
      /no current|not currently|no.*offer|not available/i,
    );
    expect(result.replyEnglish).not.toMatch(
      /wednesday.*(?:10|available|offer)|can't confirm|cannot confirm/i,
    );
  }, 30000);
  it("honours an explicit cancellation despite the affirmative draft", async () => {
    const result = await groundVenueReply({
      ...candidate,
      sources:
        "Current published menu update: Free pizza has ended. No Wednesday parties. Regular hours Thursday-Saturday.",
    });
    expect(result.corrected).toBe(true);
    expect(result.replyEnglish).toMatch(
      /ended|no longer|not.*available|no current/i,
    );
  }, 30000);
  it("retains an offer when current approved sources actually confirm it", async () => {
    const result = await groundVenueReply({
      ...candidate,
      sources:
        "Current active promotion: Free pizza every Wednesday from 10 PM to 3 AM for first guests. This special event overrides regular hours.",
    });
    expect(result.replyEnglish).toMatch(/wednesday/i);
    expect(result.replyEnglish).not.toMatch(
      /not available|no current|no longer/i,
    );
  }, 30000);
});
