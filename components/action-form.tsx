"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import type { ActionState } from "@/app/(app)/actions";

/**
 * A form bound to a server action, with its result reported in place.
 *
 * Two deliberate choices:
 *
 *  · The submit button disables itself while in flight. Double-submitting a dispense or
 *    a dispatch is exactly the race the service layer guards against — but the UI should
 *    not be the thing generating that race in the first place.
 *
 *  · Success is a quiet line, not a celebratory toast. The operator can see the table
 *    update behind it. The one exception is dispense, whose message states the
 *    irreversibility ("this code can never be dispensed again") — that is information
 *    the clerk needs, not applause.
 */

function Submit({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      className="btn btn--primary"
      disabled={pending}
      data-loading={pending}
    >
      {pending ? "Working…" : label}
    </button>
  );
}

export function ActionForm({
  action,
  submitLabel,
  children,
}: {
  action: (state: ActionState, fd: FormData) => Promise<ActionState>;
  submitLabel: string;
  children: React.ReactNode;
}) {
  const [state, formAction] = useActionState<ActionState, FormData>(action, null);

  return (
    <form
      action={formAction}
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "var(--space-sm)",
        padding: "var(--space-md)",
      }}
    >
      {children}

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "var(--space-sm)",
          flexWrap: "wrap",
        }}
      >
        <Submit label={submitLabel} />

        {state?.error ? (
          <span
            role="alert"
            style={{ color: "var(--color-danger)", fontSize: "var(--text-sm)" }}
          >
            {state.error}
          </span>
        ) : null}

        {state?.ok ? (
          <span
            role="status"
            style={{ color: "var(--color-ok)", fontSize: "var(--text-sm)" }}
          >
            {state.ok}
          </span>
        ) : null}
      </div>
    </form>
  );
}

/** A labelled control. The label is always visible — a placeholder is not a label. */
export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="field">
      <span
        style={{
          fontSize: "var(--text-sm)",
          fontWeight: 500,
          color: "var(--color-ink)",
        }}
      >
        {label}
      </span>
      {children}
      {hint ? (
        <span style={{ fontSize: "var(--text-xs)", color: "var(--color-ink-3)" }}>
          {hint}
        </span>
      ) : null}
    </label>
  );
}

/** Fields that sit side by side on a wide screen and stack on a phone. */
export function Row({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        display: "grid",
        gap: "var(--space-sm)",
        gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 12rem), 1fr))",
      }}
    >
      {children}
    </div>
  );
}
