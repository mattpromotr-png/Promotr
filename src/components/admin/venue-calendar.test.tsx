import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
vi.mock("@/app/admin/settings/actions", () => ({
  saveOpeningCalendar: vi.fn(),
}));
import { VenueOpeningCalendar } from "./venue-calendar";
import { defaultVenueCalendar } from "@/lib/venue/calendar";
afterEach(cleanup);

describe("admin opening calendar", () => {
  it("edits weekly hours, adds a dated closure and removes it", () => {
    const { container } = render(
      <VenueOpeningCalendar
        calendar={defaultVenueCalendar()}
        today="2026-10-02"
      />,
    );
    fireEvent.change(screen.getByLabelText("Friday opening time"), {
      target: { value: "21:00" },
    });
    fireEvent.click(screen.getByLabelText("Closed this night"));
    const payload = () =>
      JSON.parse(
        (container.querySelector('input[name="calendar"]') as HTMLInputElement)
          .value,
      );
    expect(payload().weekly[5].opens).toBe("21:00");
    expect(payload().exceptions[0]).toMatchObject({
      date: "2026-10-02",
      hours: { closed: true },
    });
    fireEvent.click(screen.getByText("Remove exception — use weekly hours"));
    expect(payload().exceptions).toEqual([]);
    expect(screen.getByLabelText("Closed this night")).not.toBeChecked();
    fireEvent.click(screen.getByLabelText("Next month"));
    expect(screen.getByText("November 2026")).toBeInTheDocument();
  });
  it("does not publish suggested default hours until saved", () => {
    render(<VenueOpeningCalendar calendar={null} today="2026-09-27" />);
    expect(screen.getByText(/not yet published/)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Save opening calendar" }),
    ).toBeInTheDocument();
  });
});
