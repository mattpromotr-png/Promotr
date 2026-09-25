import { describe, expect, it } from "vitest";

import {
  formatPublishedVenueInformation,
  readPublishedVenueInformation,
} from "./published-information";

describe("published venue information", () => {
  it("reads only the supported staff-published fields", () => {
    expect(
      readPublishedVenueInformation({
        name: "The Promotr Lounge",
        staffPublished: {
          hours: "Friday: 9 PM-3 AM",
          menu: "Late-night pizza is available.",
          unsupported: "ignored",
        },
      }),
    ).toMatchObject({
      hours: "Friday: 9 PM-3 AM",
      menu: "Late-night pizza is available.",
      events: "",
    });
  });

  it("formats only non-empty sections for Vera", () => {
    const information = readPublishedVenueInformation({
      staffPublished: {
        events: "Friday: DJ Nova.",
        policies: "Last entry is 2 AM.",
      },
    });

    expect(formatPublishedVenueInformation(information)).toBe(
      "[Events and promotions]\nFriday: DJ Nova.\n\n[Guest policies]\nLast entry is 2 AM.",
    );
  });
});
