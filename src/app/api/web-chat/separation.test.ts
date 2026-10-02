import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("temporary chatbot retirement", () => {
  const migration = readFileSync(
    "supabase/migrations/202610020001_retire_temporary_webchat.sql",
    "utf8",
  );

  it("gives homepage chat separate channel and session-scoped reads", () => {
    expect(migration).toContain("v_contact_id, 'webchat'");
    expect(migration).toContain("and c.channel = 'webchat'");
    expect(migration).toContain(
      "ct.instagram_scoped_id = 'web:' || p_session_id",
    );
    expect(migration).toContain("and channel = 'webchat'");
  });

  it("revokes every legacy preview RPC without deleting historical records", () => {
    for (const name of [
      "prepare_web_preview_message",
      "get_web_preview_messages",
      "complete_web_preview_reply",
    ]) {
      expect(migration).toMatch(
        new RegExp(
          `revoke all on function public\\.${name}\\([^;]+from public, anon, authenticated, service_role;`,
        ),
      );
    }
    expect(migration).not.toMatch(/delete\s+from|truncate|drop\s+table/i);
    expect(migration).toContain("and not exists (");
    expect(migration).toContain("m.provider_message_id is null");
  });
});
