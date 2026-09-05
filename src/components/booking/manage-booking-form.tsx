"use client";

import { ArrowLeft, Home, LoaderCircle, Save, XCircle } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

type BookingDetails = {
  bookingId: string;
  token: string;
  name: string;
  email: string;
  phone: string;
  partySize: number;
  preferredArrivalTime: string;
  occasion: string;
  notes: string;
};

export function ManageBookingForm({ details }: { details: BookingDetails }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [cancelled, setCancelled] = useState(false);
  const [notice, setNotice] = useState<{
    type: "success" | "error";
    text: string;
  }>();
  const initialValues: Record<string, string> = {
    name: details.name,
    email: details.email,
    phone: details.phone,
    partySize: String(details.partySize),
    preferredArrivalTime: details.preferredArrivalTime,
    occasion: details.occasion,
    notes: details.notes,
  };

  async function send(payload: Record<string, unknown>) {
    setBusy(true);
    setNotice(undefined);
    try {
      const response = await fetch("/api/bookings/manage", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          bookingId: details.bookingId,
          token: details.token,
          ...payload,
        }),
      });
      const result = await response.json();
      if (!response.ok)
        throw new Error(result.error || "Unable to update the booking.");
      setNotice({ type: "success", text: result.message });
      return true;
    } catch (error) {
      setNotice({
        type: "error",
        text: error instanceof Error ? error.message : "Please try again.",
      });
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function update(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const saved = await send({
      action: "update",
      name: form.get("name"),
      email: form.get("email"),
      phone: form.get("phone"),
      partySize: form.get("partySize"),
      preferredArrivalTime: form.get("preferredArrivalTime"),
      occasion: form.get("occasion"),
      notes: form.get("notes"),
    });
    if (saved) router.push("/");
  }

  async function cancel() {
    if (
      !window.confirm(
        "Cancel this entire table booking? This releases the table immediately.",
      )
    )
      return;
    if (await send({ action: "cancel" })) setCancelled(true);
  }

  const input =
    "focus-ring border-border bg-elevated text-foreground mt-2 min-h-11 w-full rounded-xl border px-3";
  if (cancelled)
    return (
      <section className="mt-7 rounded-2xl border border-emerald-400/30 bg-emerald-400/10 p-6 text-center">
        <XCircle className="mx-auto text-emerald-300" size={40} />
        <h2 className="text-foreground mt-4 text-xl font-semibold">
          Booking cancelled
        </h2>
        <p className="text-muted mt-2 text-sm leading-6">{notice?.text}</p>
        <Link
          href="/"
          className="focus-ring bg-brand-gradient mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl px-5 text-sm font-semibold text-white"
        >
          <Home size={17} /> Return to Promotr
        </Link>
      </section>
    );
  return (
    <form
      onSubmit={update}
      onChange={(event) => {
        const form = new FormData(event.currentTarget);
        setDirty(
          Object.entries(initialValues).some(
            ([name, value]) => String(form.get(name) ?? "") !== value,
          ),
        );
      }}
      className="mt-7 space-y-5"
    >
      <Link
        href="/"
        className="text-muted hover:text-foreground inline-flex items-center gap-2 text-sm"
      >
        <ArrowLeft size={16} /> Return to main website
      </Link>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Name">
          <input
            name="name"
            required
            defaultValue={details.name}
            className={input}
          />
        </Field>
        <Field label="Party size">
          <input
            name="partySize"
            required
            type="number"
            min="1"
            max="100"
            defaultValue={details.partySize}
            className={input}
          />
        </Field>
        <Field label="Email">
          <input
            name="email"
            type="email"
            defaultValue={details.email}
            className={input}
          />
        </Field>
        <Field label="Phone">
          <input name="phone" defaultValue={details.phone} className={input} />
        </Field>
        <Field label="Arrival time">
          <input
            name="preferredArrivalTime"
            type="time"
            defaultValue={details.preferredArrivalTime}
            className={input}
          />
        </Field>
        <Field label="Occasion">
          <input
            name="occasion"
            defaultValue={details.occasion}
            className={input}
          />
        </Field>
      </div>
      <Field label="Notes">
        <textarea
          name="notes"
          defaultValue={details.notes}
          rows={4}
          className={`${input} py-3`}
        />
      </Field>
      <p className="text-muted text-xs">
        To change the booking date or table, contact the venue so availability
        and pricing can be checked.
      </p>
      {notice && (
        <p
          role="status"
          className={`rounded-xl border p-3 text-sm ${notice.type === "success" ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-200" : "border-red-400/30 bg-red-400/10 text-red-200"}`}
        >
          {notice.text}
        </p>
      )}
      <div className="flex flex-col gap-3 sm:flex-row sm:justify-between">
        <button
          type="button"
          onClick={cancel}
          disabled={busy || cancelled}
          className="focus-ring flex min-h-11 items-center justify-center gap-2 rounded-xl border border-red-400/30 px-4 text-sm font-semibold text-red-300 disabled:opacity-50"
        >
          <XCircle size={17} />
          Cancel booking
        </button>
        {dirty && (
          <button
            disabled={busy}
            className="focus-ring bg-brand-gradient flex min-h-11 items-center justify-center gap-2 rounded-xl px-5 text-sm font-semibold text-white disabled:opacity-50"
          >
            {busy ? (
              <LoaderCircle className="animate-spin" size={17} />
            ) : (
              <Save size={17} />
            )}
            Save changes
          </button>
        )}
      </div>
    </form>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="text-foreground block text-sm font-medium">
      {label}
      {children}
    </label>
  );
}
