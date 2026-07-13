"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import type { ActionState } from "@/app/(app)/actions";

/**
 * A single button inside a table row — Revoke, Accept, Reject.
 *
 * It exists because a plain `<form action={serverAction}>` must return void, which would
 * mean throwing away the domain layer's refusal. But "this licence is already revoked"
 * or "only the receiving organization may accept a shipment" is precisely what the
 * operator needs to read. So the result is surfaced next to the button that caused it,
 * not swallowed and not thrown into a global toast the user has to go hunting for.
 */

function Button({ label, variant }: { label: string; variant: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      className={`btn ${variant}`}
      disabled={pending}
      data-loading={pending}
    >
      {pending ? "…" : label}
    </button>
  );
}

export function RowAction({
  action,
  label,
  variant = "",
  fields,
}: {
  action: (state: ActionState, fd: FormData) => Promise<ActionState>;
  label: string;
  variant?: string;
  fields: Record<string, string>;
}) {
  const [state, formAction] = useActionState<ActionState, FormData>(action, null);

  return (
    <form action={formAction} style={{ display: "inline-flex", alignItems: "center", gap: "var(--space-xs)" }}>
      {Object.entries(fields).map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={v} />
      ))}

      <Button label={label} variant={variant} />

      {state?.error ? (
        <span
          role="alert"
          style={{ color: "var(--color-danger)", fontSize: "var(--text-xs)" }}
        >
          {state.error}
        </span>
      ) : null}
    </form>
  );
}
