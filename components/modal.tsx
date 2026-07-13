"use client";

import { useActionState, useEffect, useId, useRef } from "react";
import { useFormStatus } from "react-dom";

import type { ActionState } from "@/app/(app)/actions";

/**
 * A confirmation step in front of an action that cannot be undone.
 *
 * Three things in this system are irreversible in the way that matters: revoking a
 * licence stops a manufacturer producing, rejecting a consignment sends it back, and
 * dispensing burns a code forever. Each of those was a single unguarded click. The
 * point of this dialog is not ceremony — it is to state the consequence BEFORE it is
 * incurred, in the same breath as asking for the confirmation.
 *
 * Native <dialog>, not a div. The browser gives us the focus trap, the inert
 * background, Escape-to-close and the top layer for free; a hand-rolled version of
 * those is where the accessibility bugs live.
 *
 * The dialog closes on success and STAYS OPEN on refusal. A domain error like "only
 * the receiving organization may accept a shipment" is the most important sentence on
 * the screen, and dismissing the dialog would throw it away.
 */

function Confirm({ label, variant }: { label: string; variant: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      className={`btn ${variant}`}
      disabled={pending}
      data-loading={pending}
    >
      {pending ? "Working…" : label}
    </button>
  );
}

export function ConfirmAction({
  action,
  trigger,
  triggerVariant = "",
  title,
  body,
  confirmLabel,
  confirmVariant = "btn--primary",
  fields = {},
  children,
}: {
  action: (state: ActionState, fd: FormData) => Promise<ActionState>;
  trigger: string;
  triggerVariant?: string;
  title: string;
  /** What will happen, stated plainly. The operator reads this and nothing else. */
  body: string;
  confirmLabel: string;
  confirmVariant?: string;
  /** Values the action needs that the operator does not choose — ids, mostly. */
  fields?: Record<string, string>;
  /** Anything the operator DOES choose: a rejection reason, a new expiry date. */
  children?: React.ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [state, formAction] = useActionState<ActionState, FormData>(action, null);
  const titleId = useId();

  useEffect(() => {
    if (state?.ok) ref.current?.close();
  }, [state]);

  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: "var(--space-xs)" }}>
      <button
        type="button"
        className={`btn ${triggerVariant}`}
        onClick={() => ref.current?.showModal()}
      >
        {trigger}
      </button>

      <dialog ref={ref} className="modal" aria-labelledby={titleId}>
        <form action={formAction} className="modal__body">
          <h2 id={titleId} className="modal__title">
            {title}
          </h2>
          <p className="modal__lede">{body}</p>

          {Object.entries(fields).map(([k, v]) => (
            <input key={k} type="hidden" name={k} value={v} />
          ))}

          {children}

          {state?.error ? (
            <p role="alert" className="modal__error">
              {state.error}
            </p>
          ) : null}

          <footer className="modal__foot">
            {/* type="button": inside a form, the default is submit, and a Cancel that
                performs the action it cancels is the worst bug this file could have. */}
            <button
              type="button"
              className="btn"
              onClick={() => ref.current?.close()}
            >
              Cancel
            </button>
            <Confirm label={confirmLabel} variant={confirmVariant} />
          </footer>
        </form>
      </dialog>

      {/* Confirmation lands next to the button that caused it, after the dialog goes. */}
      {state?.ok ? (
        <span
          role="status"
          style={{ color: "var(--color-ok)", fontSize: "var(--text-xs)" }}
        >
          {state.ok}
        </span>
      ) : null}
    </span>
  );
}
