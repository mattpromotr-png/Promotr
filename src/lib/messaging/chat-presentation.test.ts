import { describe, expect, it } from "vitest";
import { removeRepeatedNameGreeting } from "./chat-presentation";

describe("chat greeting continuity", () => {
  it.each(["Hey Joe! ", "Hi, Joe. ", "Hello Joe, "])(
    "removes a repeated known-name salutation: %s",
    (prefix) => {
      expect(
        removeRepeatedNameGreeting(
          `${prefix}We open at 10 PM.`,
          "Joe Smith",
          true,
        ),
      ).toBe("We open at 10 PM.");
    },
  );
  it("preserves first-turn, unrelated names and non-greeting content", () => {
    expect(removeRepeatedNameGreeting("Hey Joe! Welcome!", "Joe", false)).toBe(
      "Hey Joe! Welcome!",
    );
    expect(removeRepeatedNameGreeting("Hi Maya! Welcome!", "Joe", true)).toBe(
      "Hi Maya! Welcome!",
    );
    expect(
      removeRepeatedNameGreeting("Joe asked about Friday.", "Joe", true),
    ).toBe("Joe asked about Friday.");
    expect(removeRepeatedNameGreeting("Hey Joe!", "Joe", true)).toBe(
      "Hey Joe!",
    );
  });
});
