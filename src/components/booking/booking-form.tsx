"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, LoaderCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import {
  bookingInquirySchema,
  type BookingInquiryInput,
} from "@/lib/validation/booking";

function FieldError({ message }: { message?: string }) {
  return message ? (
    <p className="mt-1.5 text-sm text-red-400">{message}</p>
  ) : null;
}

const inputClass =
  "focus-ring mt-2 min-h-11 w-full rounded-xl border border-border bg-elevated px-3.5 py-2.5 text-sm text-foreground outline-none placeholder:text-muted/60";
const labelClass = "text-sm font-medium text-foreground";

export function BookingForm() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string>();
  const idempotencyKey = useMemo(() => crypto.randomUUID(), []);
  const tomorrow = useMemo(() => {
    const date = new Date();
    date.setDate(date.getDate() + 1);
    return date.toISOString().slice(0, 10);
  }, []);
  const {
    register,
    handleSubmit,
    control,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<BookingInquiryInput>({
    resolver: zodResolver(bookingInquirySchema),
    defaultValues: {
      idempotencyKey,
      name: "",
      email: "",
      phone: "",
      instagramHandle: "",
      requestedDate: "",
      preferredArrivalTime: "",
      partySize: 2,
      occasion: "",
      bookingType: "unsure",
      bottlePreference: "",
      notes: "",
      consent: false,
      website: "",
    },
  });
  const bookingType = useWatch({ control, name: "bookingType" });

  async function submit(values: BookingInquiryInput) {
    setServerError(undefined);
    const response = await fetch("/api/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    const payload = (await response.json()) as {
      error?: string;
      fields?: Record<string, string[]>;
    };
    if (!response.ok) {
      Object.entries(payload.fields ?? {}).forEach(([field, messages]) =>
        setError(field as keyof BookingInquiryInput, { message: messages[0] }),
      );
      setServerError(
        payload.error ?? "We couldn't send your inquiry. Please try again.",
      );
      return;
    }
    router.push("/book/success");
  }

  return (
    <form className="space-y-5" onSubmit={handleSubmit(submit)} noValidate>
      <input type="hidden" {...register("idempotencyKey")} />
      <div
        className="pointer-events-none absolute -left-[9999px]"
        aria-hidden="true"
      >
        <label htmlFor="website">Website</label>
        <input
          id="website"
          tabIndex={-1}
          autoComplete="off"
          {...register("website")}
        />
      </div>

      <div>
        <label className={labelClass} htmlFor="name">
          Guest name
        </label>
        <input
          className={inputClass}
          id="name"
          autoComplete="name"
          placeholder="Your full name"
          {...register("name")}
          aria-invalid={Boolean(errors.name)}
        />
        <FieldError message={errors.name?.message} />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label className={labelClass} htmlFor="email">
            Email
          </label>
          <input
            className={inputClass}
            id="email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            {...register("email")}
            aria-invalid={Boolean(errors.email)}
          />
          <FieldError message={errors.email?.message} />
        </div>
        <div>
          <label className={labelClass} htmlFor="phone">
            Phone
          </label>
          <input
            className={inputClass}
            id="phone"
            type="tel"
            autoComplete="tel"
            placeholder="(416) 555-0123"
            {...register("phone")}
            aria-invalid={Boolean(errors.phone)}
          />
          <FieldError message={errors.phone?.message} />
        </div>
      </div>

      <div>
        <label className={labelClass} htmlFor="instagramHandle">
          Instagram handle <span className="text-muted">(optional)</span>
        </label>
        <input
          className={inputClass}
          id="instagramHandle"
          placeholder="@yourhandle"
          {...register("instagramHandle")}
        />
      </div>

      <div className="grid gap-5 sm:grid-cols-3">
        <div>
          <label className={labelClass} htmlFor="requestedDate">
            Desired date
          </label>
          <input
            className={inputClass}
            id="requestedDate"
            type="date"
            min={tomorrow}
            {...register("requestedDate")}
            aria-invalid={Boolean(errors.requestedDate)}
          />
          <FieldError message={errors.requestedDate?.message} />
        </div>
        <div>
          <label className={labelClass} htmlFor="preferredArrivalTime">
            Arrival time
          </label>
          <input
            className={inputClass}
            id="preferredArrivalTime"
            type="time"
            {...register("preferredArrivalTime")}
          />
        </div>
        <div>
          <label className={labelClass} htmlFor="partySize">
            Party size
          </label>
          <input
            className={inputClass}
            id="partySize"
            type="number"
            min="1"
            max="100"
            {...register("partySize", { valueAsNumber: true })}
            aria-invalid={Boolean(errors.partySize)}
          />
          <FieldError message={errors.partySize?.message} />
        </div>
      </div>

      <fieldset>
        <legend className={labelClass}>What are you interested in?</legend>
        <div className="mt-2 grid gap-2 sm:grid-cols-3">
          {[
            ["guest_list", "Guest list"],
            ["table", "Table / bottles"],
            ["unsure", "Not sure"],
          ].map(([value, label]) => (
            <label
              key={value}
              className="has-[:checked]:border-violet has-[:checked]:bg-violet/10 border-border bg-elevated text-foreground flex min-h-12 cursor-pointer items-center gap-2 rounded-xl border px-3 text-sm"
            >
              <input
                type="radio"
                value={value}
                className="accent-violet"
                {...register("bookingType")}
              />
              {label}
            </label>
          ))}
        </div>
        <FieldError message={errors.bookingType?.message} />
      </fieldset>

      {bookingType === "table" && (
        <div>
          <label className={labelClass} htmlFor="bottlePreference">
            Bottle preference
          </label>
          <input
            className={inputClass}
            id="bottlePreference"
            placeholder="Vodka, tequila, champagne, or not sure"
            {...register("bottlePreference")}
            aria-invalid={Boolean(errors.bottlePreference)}
          />
          <FieldError message={errors.bottlePreference?.message} />
        </div>
      )}

      <div>
        <label className={labelClass} htmlFor="occasion">
          Occasion <span className="text-muted">(optional)</span>
        </label>
        <input
          className={inputClass}
          id="occasion"
          placeholder="Birthday, celebration…"
          {...register("occasion")}
        />
      </div>
      <div>
        <label className={labelClass} htmlFor="notes">
          Anything else? <span className="text-muted">(optional)</span>
        </label>
        <textarea
          className={`${inputClass} min-h-24 resize-y`}
          id="notes"
          placeholder="Share any details that will help the team."
          {...register("notes")}
        />
        <FieldError message={errors.notes?.message} />
      </div>

      <div>
        <label className="text-muted flex items-start gap-3 text-sm leading-6">
          <input
            type="checkbox"
            className="accent-violet mt-1 size-4"
            {...register("consent")}
          />
          I agree that Promotr may contact me about this inquiry. This does not
          confirm entry or a reservation.
        </label>
        <FieldError message={errors.consent?.message} />
      </div>
      {serverError && (
        <p
          role="alert"
          className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300"
        >
          {serverError}
        </p>
      )}
      <button
        className="focus-ring bg-brand-gradient shadow-violet flex min-h-12 w-full items-center justify-center gap-2 rounded-xl px-5 font-semibold text-white disabled:opacity-60"
        type="submit"
        disabled={isSubmitting}
      >
        {isSubmitting ? (
          <LoaderCircle className="animate-spin" size={18} aria-hidden="true" />
        ) : (
          <ArrowRight size={18} aria-hidden="true" />
        )}
        {isSubmitting ? "Sending inquiry…" : "Send booking inquiry"}
      </button>
    </form>
  );
}
