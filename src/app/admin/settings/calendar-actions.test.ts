import { beforeEach, describe, expect, it, vi } from "vitest";
import { defaultVenueCalendar } from "@/lib/venue/calendar";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  from: vi.fn(),
  revalidate: vi.fn(),
}));
vi.mock("@/lib/auth/admin", () => ({ requireAdmin: mocks.auth }));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({ from: mocks.from }),
}));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidate }));
import { saveOpeningCalendar } from "./actions";

const idle = { status: "idle" as const, message: "" };
function form(value: unknown = defaultVenueCalendar()) {
  const data = new FormData();
  data.set("calendar", JSON.stringify(value));
  return data;
}
beforeEach(() => {
  vi.clearAllMocks();
  mocks.auth.mockResolvedValue({ id: "owner" });
});

describe("save opening calendar", () => {
  it("requires authentication before accessing data", async () => {
    mocks.auth.mockRejectedValue(new Error("unauthorized"));
    await expect(saveOpeningCalendar(idle, form())).rejects.toThrow(
      "unauthorized",
    );
    expect(mocks.from).not.toHaveBeenCalled();
  });
  it("rejects malformed calendars without a database write", async () => {
    const result = await saveOpeningCalendar(idle, form({ weekly: [] }));
    expect(result.status).toBe("error");
    expect(mocks.from).not.toHaveBeenCalled();
  });
  it.each([true, false])(
    "preserves existing venue data and detects concurrent changes (saved=%s)",
    async (saved) => {
      const facts = {
        knowledgeUpdates: [{ id: "keep" }],
        staffPublished: { menu: "keep" },
      };
      const selectLoad = {
        eq: () => ({
          single: async () => ({
            data: { id: "venue", venue_facts: facts, updated_at: "revision" },
            error: null,
          }),
        }),
      };
      const update = vi.fn(
        (payload: { venue_facts: Record<string, unknown> }) => ({
          payload,
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              select: () => ({
                maybeSingle: async () => ({
                  data: saved ? { id: "venue" } : null,
                  error: null,
                }),
              }),
            })),
          })),
        }),
      );
      mocks.from.mockReturnValue({ select: () => selectLoad, update });
      const result = await saveOpeningCalendar(idle, form());
      expect(result.status).toBe(saved ? "success" : "error");
      expect(update.mock.calls[0]![0].venue_facts).toMatchObject({
        ...facts,
        openingCalendar: {
          weekly: defaultVenueCalendar().weekly,
          updatedBy: "owner",
        },
      });
      expect(mocks.revalidate).toHaveBeenCalledTimes(saved ? 1 : 0);
    },
  );
});
