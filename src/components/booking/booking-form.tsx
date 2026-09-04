"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  LoaderCircle,
  LockKeyhole,
  Users,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { tablePackages } from "@/config/table-packages";
import {
  bookingInquirySchema,
  type BookingInquiryInput,
} from "@/lib/validation/booking";

const inputClass =
  "focus-ring mt-2 min-h-11 w-full rounded-xl border border-border bg-elevated px-3.5 py-2.5 text-sm text-foreground outline-none placeholder:text-muted/60";
const labelClass = "text-sm font-medium text-foreground";
function FieldError({ message }: { message?: string }) {
  return message ? (
    <p className="mt-1.5 text-sm text-red-400">{message}</p>
  ) : null;
}

export function BookingForm({ conversationId }: { conversationId?: string }) {
  const [step, setStep] = useState<1 | 2>(1);
  const [serverError, setServerError] = useState<string>();
  const [processingPayment, setProcessingPayment] = useState(false);
  const [unavailable, setUnavailable] = useState<string[]>([]);
  const idempotencyKey = useMemo(() => crypto.randomUUID(), []);
  const tomorrow = useMemo(() => {
    const date = new Date();
    date.setDate(date.getDate() + 1);
    return date.toISOString().slice(0, 10);
  }, []);
  const form = useForm<BookingInquiryInput>({
    resolver: zodResolver(bookingInquirySchema),
    defaultValues: {
      idempotencyKey,
      conversationId,
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
      tableId: undefined,
    },
  });
  const {
    register,
    handleSubmit,
    control,
    setError,
    setValue,
    getValues,
    formState: { errors, isSubmitting },
  } = form;
  const bookingType = useWatch({ control, name: "bookingType" });
  const requestedDate = useWatch({ control, name: "requestedDate" });
  const partySize = useWatch({ control, name: "partySize" });
  const tableId = useWatch({ control, name: "tableId" });
  const selectedTable = tablePackages.find((table) => table.id === tableId);
  const validationError = Object.keys(errors).length > 0;

  useEffect(() => {
    if (!requestedDate) {
      setUnavailable([]);
      return;
    }
    fetch(`/api/tables?date=${requestedDate}`, { cache: "no-store" })
      .then((response) =>
        response.ok ? response.json() : { unavailableTableIds: [] },
      )
      .then((payload) => setUnavailable(payload.unavailableTableIds ?? []))
      .catch(() => setUnavailable([]));
  }, [requestedDate]);

  function review(values: BookingInquiryInput) {
    if (values.bookingType === "table") {
      const table = tablePackages.find((item) => item.id === values.tableId);
      if (!table || unavailable.includes(table.id)) {
        setError("tableId", { message: "Select an available table." });
        return;
      }
      if (values.partySize > table.capacity) {
        setError("tableId", {
          message: `This table accommodates up to ${table.capacity} guests.`,
        });
        return;
      }
    }
    setServerError(undefined);
    setStep(2);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function submit() {
    if (processingPayment) return;
    setProcessingPayment(true);
    const values = getValues();
    setServerError(undefined);
    const response = await fetch("/api/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    const payload = (await response.json()) as {
      leadId?: string;
      error?: string;
      fields?: Record<string, string[]>;
    };
    if (!response.ok || !payload.leadId) {
      setServerError(payload.error || "We couldn't create this inquiry.");
      setProcessingPayment(false);
      return;
    }
    if (values.bookingType !== "table" || !values.tableId) {
      window.location.assign("/book/success");
      return;
    }
    const checkout = await fetch("/api/deposits/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ leadId: payload.leadId, tableId: values.tableId }),
    });
    const checkoutPayload = (await checkout.json()) as {
      url?: string;
      error?: string;
    };
    if (!checkout.ok || !checkoutPayload.url) {
      setServerError(
        checkoutPayload.error || "Unable to start secure payment.",
      );
      setProcessingPayment(false);
      return;
    }
    window.location.assign(checkoutPayload.url);
  }

  return (
    <form
      className="space-y-5"
      onSubmit={
        step === 1
          ? handleSubmit(review)
          : (event) => {
              event.preventDefault();
              void submit();
            }
      }
      noValidate
    >
      <input type="hidden" {...register("idempotencyKey")} />
      <input type="hidden" {...register("conversationId")} />
      <input type="hidden" {...register("tableId")} />
      <div
        className="mb-7 grid grid-cols-[1fr_auto_1fr] items-center gap-3"
        aria-label="Booking progress"
      >
        <span
          className={`h-1 rounded-full ${step >= 1 ? "bg-violet" : "bg-border"}`}
        />
        <span className="text-muted text-xs font-semibold">
          Step {step} of 2
        </span>
        <span
          className={`h-1 rounded-full ${step === 2 ? "bg-violet" : "bg-border"}`}
        />
      </div>
      {step === 1 ? (
        <>
          <div
            className="pointer-events-none absolute -left-[9999px]"
            aria-hidden="true"
          >
            <input tabIndex={-1} autoComplete="off" {...register("website")} />
          </div>
          <div>
            <label className={labelClass} htmlFor="name">
              Guest name
            </label>
            <input
              id="name"
              className={inputClass}
              autoComplete="name"
              placeholder="Your full name"
              {...register("name")}
            />
            <FieldError message={errors.name?.message} />
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label className={labelClass} htmlFor="email">
                Email
              </label>
              <input
                id="email"
                type="email"
                className={inputClass}
                autoComplete="email"
                placeholder="you@example.com"
                {...register("email")}
              />
              <FieldError message={errors.email?.message} />
            </div>
            <div>
              <label className={labelClass} htmlFor="phone">
                Phone
              </label>
              <input
                id="phone"
                type="tel"
                className={inputClass}
                autoComplete="tel"
                placeholder="(416) 555-0123"
                {...register("phone")}
              />
              <FieldError message={errors.phone?.message} />
            </div>
          </div>
          <div>
            <label className={labelClass} htmlFor="instagramHandle">
              Instagram handle <span className="text-muted">(optional)</span>
            </label>
            <input
              id="instagramHandle"
              className={inputClass}
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
                id="requestedDate"
                type="date"
                min={tomorrow}
                className={inputClass}
                {...register("requestedDate")}
              />
              <FieldError message={errors.requestedDate?.message} />
            </div>
            <div>
              <label className={labelClass} htmlFor="preferredArrivalTime">
                Arrival time
              </label>
              <input
                id="preferredArrivalTime"
                type="time"
                className={inputClass}
                {...register("preferredArrivalTime")}
              />
            </div>
            <div>
              <label className={labelClass} htmlFor="partySize">
                Party size
              </label>
              <input
                id="partySize"
                type="number"
                min="1"
                max="100"
                className={inputClass}
                {...register("partySize", { valueAsNumber: true })}
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
          </fieldset>
          {bookingType === "table" && (
            <>
              <div>
                <label className={labelClass}>Bottle preference</label>
                <input
                  className={inputClass}
                  placeholder="Vodka, tequila, champagne, or not sure"
                  {...register("bottlePreference")}
                />
                <FieldError message={errors.bottlePreference?.message} />
              </div>
              <section>
                <div className="flex items-end justify-between gap-3">
                  <div>
                    <h3 className={labelClass}>Select your table</h3>
                    <p className="text-muted mt-1 text-xs">
                      Availability is checked for your selected date.
                    </p>
                  </div>
                  <span className="text-muted text-xs">DJ booth at top</span>
                </div>
                <div className="border-border relative mt-3 aspect-[16/10] overflow-hidden rounded-2xl border bg-[#080a12]">
                  <div className="bg-violet/25 absolute top-3 left-1/2 -translate-x-1/2 rounded-lg px-5 py-2 text-[10px] font-bold tracking-widest text-violet-200">
                    DJ
                  </div>
                  <div className="border-violet/20 bg-violet/5 absolute inset-x-[28%] top-[22%] bottom-[12%] rounded-[2rem] border">
                    <span className="text-muted grid h-full place-items-center text-[10px] tracking-widest">
                      DANCE FLOOR
                    </span>
                  </div>
                  {tablePackages.map((table) => {
                    const blocked =
                      unavailable.includes(table.id) ||
                      Number(partySize || 0) > table.capacity;
                    const selected = table.id === tableId;
                    return (
                      <button
                        key={table.id}
                        type="button"
                        disabled={blocked}
                        onClick={() =>
                          setValue("tableId", table.id, {
                            shouldValidate: true,
                          })
                        }
                        style={{ left: `${table.x}%`, top: `${table.y}%` }}
                        className={`focus-ring absolute grid size-12 place-items-center rounded-full border text-xs font-bold transition sm:size-14 ${selected ? "border-violet bg-violet shadow-violet text-white" : blocked ? "border-red-500/25 bg-red-500/10 text-red-300 opacity-55" : "hover:border-violet border-white/20 bg-white/10 text-white hover:scale-110"}`}
                        aria-label={`${table.name}, ${blocked ? "unavailable" : "available"}`}
                      >
                        {table.code}
                      </button>
                    );
                  })}
                </div>
                <div className="mt-3 flex flex-wrap gap-3 text-[11px]">
                  <span className="text-emerald-400">● Available</span>
                  <span className="text-violet">● Selected</span>
                  <span className="text-red-400">
                    ● Unavailable / too small
                  </span>
                </div>
                {selectedTable && (
                  <div className="border-violet/25 bg-violet/10 mt-3 grid gap-2 rounded-xl border p-4 text-sm sm:grid-cols-3">
                    <span>
                      <span className="text-muted block text-xs">Table</span>
                      {selectedTable.name}
                    </span>
                    <span>
                      <span className="text-muted block text-xs">Capacity</span>
                      Up to {selectedTable.capacity}
                    </span>
                    <span>
                      <span className="text-muted block text-xs">Deposit</span>$
                      {selectedTable.depositCad} CAD
                    </span>
                  </div>
                )}
                <FieldError message={errors.tableId?.message} />
              </section>
            </>
          )}
          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label className={labelClass}>
                Occasion <span className="text-muted">(optional)</span>
              </label>
              <input
                className={inputClass}
                placeholder="Birthday, celebration…"
                {...register("occasion")}
              />
            </div>
            <div>
              <label className={labelClass}>
                Additional notes <span className="text-muted">(optional)</span>
              </label>
              <input
                className={inputClass}
                placeholder="Anything the team should know"
                {...register("notes")}
              />
            </div>
          </div>
          <label className="text-muted flex items-start gap-3 text-sm leading-6">
            <input
              type="checkbox"
              className="accent-violet mt-1 size-4"
              {...register("consent")}
            />
            I agree that Promotr may contact me about this inquiry and payment.
          </label>
          <FieldError message={errors.consent?.message} />
          {validationError && (
            <p
              role="alert"
              className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-200"
            >
              Please check the highlighted booking details before continuing.
            </p>
          )}
          <button
            className="focus-ring bg-brand-gradient shadow-violet flex min-h-12 w-full items-center justify-center gap-2 rounded-xl px-5 font-semibold text-white"
            type="submit"
          >
            Review and continue <ArrowRight size={18} />
          </button>
        </>
      ) : (
        <>
          <section className="border-border bg-elevated rounded-2xl border p-5">
            <p className="eyebrow">BOOKING SUMMARY</p>
            <h3 className="text-foreground mt-2 text-xl font-semibold">
              {getValues("name")}
            </h3>
            <dl className="text-muted mt-5 grid gap-4 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-xs">Date</dt>
                <dd className="text-foreground mt-1">
                  {getValues("requestedDate")}
                </dd>
              </div>
              <div>
                <dt className="text-xs">Party</dt>
                <dd className="text-foreground mt-1">
                  {getValues("partySize")} guests
                </dd>
              </div>
              {selectedTable && (
                <>
                  <div>
                    <dt className="text-xs">Selected table</dt>
                    <dd className="text-foreground mt-1">
                      {selectedTable.name} · {selectedTable.zone}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs">Minimum spend</dt>
                    <dd className="text-foreground mt-1">
                      ${selectedTable.minimumSpendCad} CAD
                    </dd>
                  </div>
                </>
              )}
            </dl>
          </section>
          {selectedTable ? (
            <section className="border-violet/25 bg-violet/10 rounded-2xl border p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted text-xs">Deposit due now</p>
                  <p className="text-foreground mt-1 text-3xl font-semibold">
                    ${selectedTable.depositCad}{" "}
                    <span className="text-sm">CAD</span>
                  </p>
                </div>
                <LockKeyhole className="text-violet" />
              </div>
              <ul className="text-muted mt-5 space-y-2 text-xs leading-5">
                <li>
                  • The deposit is applied toward the $
                  {selectedTable.minimumSpendCad} minimum spend.
                </li>
                <li>
                  • Your table is held for 30 minutes while payment is
                  completed.
                </li>
                <li>
                  • The deposit is refundable when cancelled at least 48 hours
                  before the booking date.
                </li>
                <li>• Late cancellations and no-shows are non-refundable.</li>
                <li>
                  • Final confirmation is issued only after successful payment
                  verification.
                </li>
              </ul>
            </section>
          ) : (
            <section className="border-border bg-elevated rounded-2xl border p-5">
              <Check className="text-emerald-400" />
              <h3 className="text-foreground mt-3 font-semibold">
                No deposit required
              </h3>
              <p className="text-muted mt-2 text-sm">
                Submit your inquiry and the venue team will contact you about
                availability.
              </p>
            </section>
          )}
          {serverError && (
            <p
              role="alert"
              className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300"
            >
              {serverError}
            </p>
          )}
          <div className="grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="focus-ring border-border bg-elevated text-foreground flex min-h-12 items-center justify-center gap-2 rounded-xl border"
            >
              <ArrowLeft size={17} />
              Back
            </button>
            <button
              type="submit"
              disabled={isSubmitting || processingPayment}
              className="focus-ring bg-brand-gradient shadow-violet flex min-h-12 items-center justify-center gap-2 rounded-xl px-5 font-semibold text-white disabled:opacity-60"
            >
              {isSubmitting || processingPayment ? (
                <LoaderCircle className="animate-spin" size={18} />
              ) : (
                <LockKeyhole size={17} />
              )}
              {isSubmitting || processingPayment
                ? "Preparing…"
                : selectedTable
                  ? `Pay $${selectedTable.depositCad} deposit`
                  : "Submit inquiry"}
            </button>
          </div>
        </>
      )}
    </form>
  );
}
