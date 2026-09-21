"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2, LoaderCircle } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";

import {
  lostFoundReportSchema,
  type LostFoundReportInput,
} from "@/lib/validation/lost-found";

const inputClass =
  "focus-ring mt-2 min-h-11 w-full rounded-xl border border-border bg-elevated px-3.5 py-2.5 text-sm text-foreground outline-none placeholder:text-muted/60";
const labelClass = "text-sm font-medium text-foreground";

function FieldError({ message }: { message?: string }) {
  return message ? (
    <p className="mt-1.5 text-sm text-red-400">{message}</p>
  ) : null;
}

export function LostFoundForm({ conversationId }: { conversationId?: string }) {
  const [serverError, setServerError] = useState<string>();
  const [submitted, setSubmitted] = useState(false);
  const idempotencyKey = useMemo(() => crypto.randomUUID(), []);
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const form = useForm<LostFoundReportInput>({
    resolver: zodResolver(lostFoundReportSchema),
    defaultValues: {
      idempotencyKey,
      conversationId,
      name: "",
      phone: "",
      email: "",
      itemDescription: "",
      lostDate: today,
      approximateLostTime: "",
      lastKnownLocation: "",
      consent: false,
      website: "",
    },
  });
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = form;

  async function submit(values: LostFoundReportInput) {
    setServerError(undefined);
    const response = await fetch("/api/lost-found/reports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    const payload = (await response.json()) as {
      error?: string;
      fields?: Record<string, string[]>;
    };
    if (!response.ok) {
      for (const [field, messages] of Object.entries(payload.fields ?? {})) {
        setError(field as keyof LostFoundReportInput, {
          message: messages?.[0],
        });
      }
      setServerError(payload.error || "We couldn't send your report.");
      return;
    }
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <div
        className="grid min-h-72 place-items-center text-center"
        role="status"
      >
        <div>
          <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-emerald-500/10 text-emerald-400">
            <CheckCircle2 size={26} />
          </span>
          <h2 className="text-foreground mt-5 text-2xl font-semibold">
            Report received
          </h2>
          <p className="text-muted mx-auto mt-3 max-w-md text-sm leading-6">
            The venue team will review the details and contact you if a possible
            match is found. Submission does not confirm that the item has been
            recovered.
          </p>
        </div>
      </div>
    );
  }

  return (
    <form className="space-y-5" onSubmit={handleSubmit(submit)} noValidate>
      <input type="hidden" {...register("idempotencyKey")} />
      <input type="hidden" {...register("conversationId")} />
      <div
        className="pointer-events-none absolute -left-[9999px]"
        aria-hidden="true"
      >
        <input tabIndex={-1} autoComplete="off" {...register("website")} />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label className={labelClass} htmlFor="name">
            Full name
          </label>
          <input
            id="name"
            autoComplete="name"
            className={inputClass}
            {...register("name")}
          />
          <FieldError message={errors.name?.message} />
        </div>
        <div>
          <label className={labelClass} htmlFor="phone">
            Phone number
          </label>
          <input
            id="phone"
            type="tel"
            autoComplete="tel"
            className={inputClass}
            {...register("phone")}
          />
          <FieldError message={errors.phone?.message} />
        </div>
      </div>
      <div>
        <label className={labelClass} htmlFor="email">
          Email
        </label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          className={inputClass}
          {...register("email")}
        />
        <FieldError message={errors.email?.message} />
      </div>
      <div>
        <label className={labelClass} htmlFor="itemDescription">
          Lost item
        </label>
        <textarea
          id="itemDescription"
          rows={4}
          className={inputClass}
          placeholder="Describe the item, including colour, brand, or identifying details."
          {...register("itemDescription")}
        />
        <FieldError message={errors.itemDescription?.message} />
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label className={labelClass} htmlFor="lostDate">
            Date lost
          </label>
          <input
            id="lostDate"
            type="date"
            max={today}
            className={inputClass}
            {...register("lostDate")}
          />
          <FieldError message={errors.lostDate?.message} />
        </div>
        <div>
          <label className={labelClass} htmlFor="approximateLostTime">
            Approximate time <span className="text-muted">(optional)</span>
          </label>
          <input
            id="approximateLostTime"
            type="time"
            className={inputClass}
            {...register("approximateLostTime")}
          />
        </div>
      </div>
      <div>
        <label className={labelClass} htmlFor="lastKnownLocation">
          Last known location <span className="text-muted">(optional)</span>
        </label>
        <input
          id="lastKnownLocation"
          className={inputClass}
          placeholder="For example: near table 8, dance floor, or coat check"
          {...register("lastKnownLocation")}
        />
      </div>
      <label className="border-border bg-elevated flex items-start gap-3 rounded-xl border p-4 text-sm leading-6">
        <input
          type="checkbox"
          className="mt-1 accent-violet-500"
          {...register("consent")}
        />
        <span className="text-muted">
          I agree that the venue may contact me about this lost-item report.
        </span>
      </label>
      <FieldError message={errors.consent?.message} />
      <p className="text-muted text-xs leading-5">
        See our{" "}
        <Link href="/privacy" className="underline underline-offset-4">
          privacy policy
        </Link>{" "}
        for how we handle your information.
      </p>
      {serverError && (
        <p className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-300">
          {serverError}
        </p>
      )}
      <button
        type="submit"
        disabled={isSubmitting}
        className="focus-ring bg-brand-gradient shadow-violet inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl px-5 text-sm font-semibold text-white disabled:opacity-60"
      >
        {isSubmitting && <LoaderCircle className="animate-spin" size={17} />}
        {isSubmitting ? "Sending report…" : "Send lost-item report"}
      </button>
    </form>
  );
}
