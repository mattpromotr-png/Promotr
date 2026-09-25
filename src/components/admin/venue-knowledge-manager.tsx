"use client";

import {
  CalendarClock,
  Check,
  Clock3,
  Edit3,
  EyeOff,
  FileText,
  LoaderCircle,
  Plus,
  Save,
  Send,
} from "lucide-react";
import { useActionState, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";

import {
  createVenueKnowledge,
  setVenueKnowledgeStatus,
  updateVenueKnowledge,
  type VenueInformationState,
} from "@/app/admin/settings/actions";
import {
  getVenueKnowledgeDisplayStatus,
  VENUE_KNOWLEDGE_CATEGORIES,
  VENUE_KNOWLEDGE_CATEGORY_LABELS,
  type VenueKnowledgeUpdate,
} from "@/lib/venue/knowledge";

const initialState: VenueInformationState = { status: "idle", message: "" };

export function VenueKnowledgeManager({
  updates,
}: {
  updates: VenueKnowledgeUpdate[];
}) {
  return (
    <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(300px,0.75fr)_minmax(0,1.25fr)]">
      <CreateKnowledgeForm />

      <div>
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-foreground text-sm font-semibold">
              Update history
            </h3>
            <p className="text-muted mt-1 text-xs">
              Drafts are private. Published updates are used only while active.
            </p>
          </div>
          <span className="border-border bg-elevated text-muted rounded-full border px-2.5 py-1 text-xs">
            {updates.length} {updates.length === 1 ? "update" : "updates"}
          </span>
        </div>

        {updates.length ? (
          <div className="mt-3 space-y-3">
            {updates.map((update) => (
              <KnowledgeCard key={update.id} update={update} />
            ))}
          </div>
        ) : (
          <div className="border-border bg-elevated mt-3 rounded-2xl border border-dashed p-7 text-center">
            <FileText
              size={24}
              className="text-muted mx-auto"
              aria-hidden="true"
            />
            <p className="text-foreground mt-3 text-sm font-medium">
              No knowledge updates yet
            </p>
            <p className="text-muted mt-1 text-xs">
              Add the first confirmed venue update using the form.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function CreateKnowledgeForm() {
  const [state, action, pending] = useActionState(
    createVenueKnowledge,
    initialState,
  );
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.status === "success") formRef.current?.reset();
  }, [state.status, state.token]);

  return (
    <form
      ref={formRef}
      action={action}
      className="border-border bg-elevated h-fit rounded-2xl border p-4 sm:p-5"
    >
      <div className="flex items-center gap-2">
        <span className="bg-violet/15 text-violet grid size-8 place-items-center rounded-lg">
          <Plus size={16} aria-hidden="true" />
        </span>
        <div>
          <h3 className="text-foreground text-sm font-semibold">
            Add venue knowledge
          </h3>
          <p className="text-muted text-xs">Times use Toronto time.</p>
        </div>
      </div>

      <KnowledgeFields />

      <ActionMessage state={state} />
      <div className="mt-4 flex flex-wrap justify-end gap-2">
        <button
          type="submit"
          name="submitMode"
          value="draft"
          disabled={pending}
          className="focus-ring border-border bg-surface text-foreground hover:border-violet inline-flex min-h-10 items-center gap-2 rounded-xl border px-3.5 text-sm font-medium disabled:opacity-60"
        >
          {pending ? (
            <LoaderCircle size={16} className="animate-spin" />
          ) : (
            <Save size={16} />
          )}
          Save draft
        </button>
        <button
          type="submit"
          name="submitMode"
          value="publish"
          disabled={pending}
          className="focus-ring bg-brand-gradient inline-flex min-h-10 items-center gap-2 rounded-xl px-4 text-sm font-semibold text-white disabled:opacity-60"
        >
          <Send size={16} aria-hidden="true" />
          Publish
        </button>
      </div>
    </form>
  );
}

function KnowledgeCard({ update }: { update: VenueKnowledgeUpdate }) {
  const displayStatus = getVenueKnowledgeDisplayStatus(update);
  const [state, action, pending] = useActionState(
    updateVenueKnowledge,
    initialState,
  );

  return (
    <article className="border-border bg-elevated rounded-2xl border p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={displayStatus} />
            <span className="text-muted text-xs">
              {VENUE_KNOWLEDGE_CATEGORY_LABELS[update.category]}
            </span>
          </div>
          <h4 className="text-foreground mt-2 font-semibold">{update.title}</h4>
          <p className="text-muted mt-1 text-sm leading-6 whitespace-pre-wrap">
            {update.content}
          </p>
          <KnowledgeTiming update={update} />
        </div>

        <div className="flex shrink-0 flex-wrap gap-2">
          {update.status !== "published" ? (
            <StatusForm id={update.id} status="published" label="Publish" />
          ) : null}
          {update.status === "published" ? (
            <StatusForm id={update.id} status="inactive" label="Deactivate" />
          ) : null}
        </div>
      </div>

      <details className="border-border mt-4 border-t pt-3">
        <summary className="focus-ring text-violet inline-flex cursor-pointer list-none items-center gap-2 rounded-lg text-sm font-medium">
          <Edit3 size={15} aria-hidden="true" />
          Edit update
        </summary>
        <form action={action} className="mt-4">
          <input type="hidden" name="id" value={update.id} />
          <KnowledgeFields update={update} />
          <ActionMessage state={state} />
          <div className="mt-4 flex justify-end">
            <button
              type="submit"
              disabled={pending}
              className="focus-ring bg-brand-gradient inline-flex min-h-10 items-center gap-2 rounded-xl px-4 text-sm font-semibold text-white disabled:opacity-60"
            >
              {pending ? (
                <LoaderCircle size={16} className="animate-spin" />
              ) : (
                <Save size={16} />
              )}
              Save changes
            </button>
          </div>
        </form>
      </details>
    </article>
  );
}

function KnowledgeFields({ update }: { update?: VenueKnowledgeUpdate }) {
  return (
    <div className="mt-4 space-y-4">
      <label className="block">
        <span className="text-foreground text-xs font-medium">Category</span>
        <select
          name="category"
          defaultValue={update?.category ?? "general"}
          className="focus-ring border-border bg-surface text-foreground mt-1.5 min-h-10 w-full rounded-xl border px-3 text-sm"
        >
          {VENUE_KNOWLEDGE_CATEGORIES.map((category) => (
            <option key={category} value={category}>
              {VENUE_KNOWLEDGE_CATEGORY_LABELS[category]}
            </option>
          ))}
        </select>
      </label>

      <label className="block">
        <span className="text-foreground text-xs font-medium">Title</span>
        <input
          name="title"
          required
          maxLength={120}
          defaultValue={update?.title ?? ""}
          placeholder="Example: Friday champagne menu"
          className="focus-ring border-border bg-surface text-foreground placeholder:text-muted mt-1.5 min-h-10 w-full rounded-xl border px-3 text-sm"
        />
      </label>

      <label className="block">
        <span className="text-foreground text-xs font-medium">
          Confirmed information
        </span>
        <textarea
          name="content"
          required
          maxLength={2000}
          rows={4}
          defaultValue={update?.content ?? ""}
          placeholder="Write exactly what Vera should know. Include conditions and limits."
          className="focus-ring border-border bg-surface text-foreground placeholder:text-muted mt-1.5 w-full resize-y rounded-xl border px-3 py-2.5 text-sm leading-6"
        />
      </label>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="text-foreground text-xs font-medium">
            Starts (optional)
          </span>
          <input
            name="effectiveFrom"
            type="datetime-local"
            defaultValue={toTorontoInput(update?.effectiveFrom)}
            className="focus-ring border-border bg-surface text-foreground mt-1.5 min-h-10 w-full rounded-xl border px-3 text-sm"
          />
        </label>
        <label className="block">
          <span className="text-foreground text-xs font-medium">
            Ends (optional)
          </span>
          <input
            name="effectiveUntil"
            type="datetime-local"
            defaultValue={toTorontoInput(update?.effectiveUntil)}
            className="focus-ring border-border bg-surface text-foreground mt-1.5 min-h-10 w-full rounded-xl border px-3 text-sm"
          />
        </label>
      </div>
    </div>
  );
}

function StatusForm({
  id,
  status,
  label,
}: {
  id: string;
  status: "published" | "inactive";
  label: string;
}) {
  return (
    <form action={setVenueKnowledgeStatus}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="status" value={status} />
      <StatusSubmit label={label} status={status} />
    </form>
  );
}

function StatusSubmit({
  label,
  status,
}: {
  label: string;
  status: "published" | "inactive";
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className={`focus-ring inline-flex min-h-9 items-center gap-1.5 rounded-lg border px-3 text-xs font-semibold disabled:opacity-60 ${
        status === "published"
          ? "border-violet/40 bg-violet/10 text-violet"
          : "border-border bg-surface text-muted hover:text-foreground"
      }`}
    >
      {pending ? (
        <LoaderCircle size={14} className="animate-spin" />
      ) : status === "published" ? (
        <Check size={14} />
      ) : (
        <EyeOff size={14} />
      )}
      {pending ? "Updating…" : label}
    </button>
  );
}

function KnowledgeTiming({ update }: { update: VenueKnowledgeUpdate }) {
  if (!update.effectiveFrom && !update.effectiveUntil)
    return (
      <p className="text-muted mt-3 flex items-center gap-1.5 text-xs">
        <Clock3 size={13} aria-hidden="true" /> Active until deactivated
      </p>
    );
  return (
    <p className="text-muted mt-3 flex flex-wrap items-center gap-1.5 text-xs">
      <CalendarClock size={13} aria-hidden="true" />
      {update.effectiveFrom
        ? `From ${formatTorontoDate(update.effectiveFrom)}`
        : "Immediately"}
      {update.effectiveUntil
        ? ` until ${formatTorontoDate(update.effectiveUntil)}`
        : " until deactivated"}
    </p>
  );
}

function StatusBadge({
  status,
}: {
  status: ReturnType<typeof getVenueKnowledgeDisplayStatus>;
}) {
  const styles = {
    active: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300",
    scheduled: "bg-sky-500/15 text-sky-600 dark:text-sky-300",
    draft: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
    expired: "bg-slate-500/15 text-slate-600 dark:text-slate-300",
    inactive: "bg-slate-500/15 text-slate-600 dark:text-slate-300",
  };
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize ${styles[status]}`}
    >
      {status}
    </span>
  );
}

function ActionMessage({ state }: { state: VenueInformationState }) {
  return state.message ? (
    <p
      aria-live="polite"
      className={`mt-3 text-xs ${state.status === "error" ? "text-red-500" : "text-emerald-600 dark:text-emerald-400"}`}
    >
      {state.message}
    </p>
  ) : null;
}

function formatTorontoDate(value: string) {
  return new Intl.DateTimeFormat("en-CA", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "America/Toronto",
  }).format(new Date(value));
}

function toTorontoInput(value?: string | null) {
  if (!value) return "";
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Toronto",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  })
    .formatToParts(new Date(value))
    .reduce<Record<string, string>>((result, part) => {
      if (part.type !== "literal") result[part.type] = part.value;
      return result;
    }, {});
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
}
