"use client";

import { Home, LoaderCircle, Save } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

type Details = {
  leadId: string;
  token: string;
  name: string;
  email: string;
  phone: string;
  requestedDate: string;
  partySize: number;
  preferredArrivalTime: string;
  occasion: string;
  notes: string;
};

export function ManageInquiryForm({ details }: { details: Details }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState("");
  const initial = Object.fromEntries(
    Object.entries(details).map(([key, value]) => [key, String(value)]),
  );
  const input =
    "focus-ring border-border bg-elevated text-foreground mt-2 min-h-11 w-full rounded-xl border px-3";

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/inquiries/manage", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          leadId: details.leadId,
          token: details.token,
          name: form.get("name"),
          email: form.get("email"),
          phone: form.get("phone"),
          requestedDate: form.get("requestedDate"),
          partySize: form.get("partySize"),
          preferredArrivalTime: form.get("preferredArrivalTime"),
          occasion: form.get("occasion"),
          notes: form.get("notes"),
        }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Unable to update.");
      router.push("/");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Please try again.");
      setBusy(false);
    }
  }

  return (
    <form
      onSubmit={submit}
      onChange={(event) => {
        const form = new FormData(event.currentTarget);
        setDirty(
          ["name", "email", "phone", "requestedDate", "partySize", "preferredArrivalTime", "occasion", "notes"].some(
            (name) => String(form.get(name) ?? "") !== initial[name],
          ),
        );
      }}
      className="mt-7 space-y-5"
    >
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Name"><input name="name" required defaultValue={details.name} className={input} /></Field>
        <Field label="Party size"><input name="partySize" required type="number" min="1" max="100" defaultValue={details.partySize} className={input} /></Field>
        <Field label="Email"><input name="email" type="email" defaultValue={details.email} className={input} /></Field>
        <Field label="Phone"><input name="phone" defaultValue={details.phone} className={input} /></Field>
        <Field label="Requested date"><input name="requestedDate" required type="date" defaultValue={details.requestedDate} className={input} /></Field>
        <Field label="Arrival time"><input name="preferredArrivalTime" type="time" defaultValue={details.preferredArrivalTime} className={input} /></Field>
        <Field label="Occasion"><input name="occasion" defaultValue={details.occasion} className={input} /></Field>
      </div>
      <Field label="Notes"><textarea name="notes" rows={4} defaultValue={details.notes} className={`${input} py-3`} /></Field>
      {error && <p role="alert" className="rounded-xl border border-red-400/30 bg-red-400/10 p-3 text-sm text-red-200">{error}</p>}
      <div className="flex flex-col gap-3 sm:flex-row sm:justify-between">
        <Link href="/" className="focus-ring border-border inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border px-4 text-sm font-semibold"><Home size={17} /> Return to Promotr</Link>
        {dirty && <button disabled={busy} className="focus-ring bg-brand-gradient inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-5 text-sm font-semibold text-white disabled:cursor-wait disabled:opacity-60">{busy ? <LoaderCircle className="animate-spin" size={17} /> : <Save size={17} />} {busy ? "Saving…" : "Save changes"}</button>}
      </div>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="text-foreground block text-sm font-medium">{label}{children}</label>;
}
