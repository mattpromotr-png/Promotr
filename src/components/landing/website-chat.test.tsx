import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { WebsiteChat } from "./website-chat";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  sessionStorage.clear();
});
describe("website chat widget", () => {
  it("opens accessibly and sends a guest message", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({
              conversationId: "84a39de2-3a57-40a0-aec1-df9f38d71957",
              messages: [
                {
                  id: "one",
                  sender: "guest",
                  content: "Hi",
                  createdAt: "2026-09-28",
                },
                {
                  id: "two",
                  sender: "vera",
                  content: "Welcome!",
                  createdAt: "2026-09-28",
                },
              ],
            }),
            { status: 200 },
          ),
      ),
    );
    vi.stubGlobal("crypto", {
      randomUUID: () => "beabf7a7-e632-4792-805a-6e6d7cb42b35",
    });
    render(<WebsiteChat />);
    fireEvent.click(screen.getByRole("button", { name: "Chat with Vera" }));
    expect(
      screen.getByRole("dialog", { name: "Chat with Vera" }),
    ).toBeInTheDocument();
    fireEvent.change(screen.getByRole("textbox", { name: "Your message" }), {
      target: { value: "Hi" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Send message" }));
    await waitFor(() =>
      expect(screen.getByText("Welcome!")).toBeInTheDocument(),
    );
    expect(
      sessionStorage.getItem("promotr_web_chat_conversation"),
    ).toBeTruthy();
    expect(screen.getByRole("link", { name: "Privacy" })).toHaveAttribute(
      "href",
      "/privacy",
    );
  });
  it("renders a lost-item form link from Vera's reply", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({
              conversationId: "84a39de2-3a57-40a0-aec1-df9f38d71957",
              messages: [
                {
                  id: "reply",
                  sender: "vera",
                  content:
                    "I can help. Lost-item report: http://localhost:3000/lost-found?conversation=84a39de2-3a57-40a0-aec1-df9f38d71957",
                  createdAt: "2026-09-28",
                },
              ],
            }),
            { status: 200 },
          ),
      ),
    );
    vi.stubGlobal("crypto", {
      randomUUID: () => "beabf7a7-e632-4792-805a-6e6d7cb42b35",
    });
    render(<WebsiteChat />);
    fireEvent.click(screen.getByRole("button", { name: "Chat with Vera" }));
    fireEvent.change(screen.getByRole("textbox", { name: "Your message" }), {
      target: { value: "I lost my phone" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Send message" }));
    expect(
      await screen.findByRole("link", { name: "Open lost-item form" }),
    ).toHaveAttribute(
      "href",
      "http://localhost:3000/lost-found?conversation=84a39de2-3a57-40a0-aec1-df9f38d71957",
    );
  });
});
