"use client";

import { useActionState, useEffect, useId, useRef, useState } from "react";
import { useFormStatus } from "react-dom";

import type { ActionState } from "@/app/(app)/actions";

/**
 * Dispensing, with the consequence stated before it is incurred.
 *
 * Dispensing is the one truly terminal act in the chain: the code is burned, the pack
 * is sold, and no later scan can ever come back clean. The console used to tell the
 * clerk this AFTERWARDS — the success message read "this code can never be dispensed
 * again", which is information arriving exactly one click too late.
 *
 * So the code is echoed back in full before it goes. A clerk who scanned the wrong box,
 * or whose gun read a neighbouring carton, has one place to catch it: seeing the code
 * they are about to burn, next to the word that says it is permanent.
 */

function Confirm() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      className="btn btn--danger"
      disabled={pending}
      data-loading={pending}
    >
      {pending ? "Dispensing…" : "Yes — dispense it"}
    </button>
  );
}

export function DispenseForm({
  action,
}: {
  action: (state: ActionState, fd: FormData) => Promise<ActionState>;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const [unitId, setUnitId] = useState("");
  const [state, formAction] = useActionState<ActionState, FormData>(action, null);
  const titleId = useId();

  useEffect(() => {
    if (!state?.ok) return;
    ref.current?.close();
    // The counter dispenses all day. Clear the field and put the cursor back in it, so
    // the next box can simply be scanned without touching the mouse.
    setUnitId("");
    input.current?.focus();
  }, [state]);

  return (
    <div style={{ padding: "var(--space-md)" }}>
      {/* This form does not submit. Its only job is to collect and validate the code;
          the submit that reaches the server lives inside the dialog. */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          ref.current?.showModal();
        }}
        style={{ display: "flex", flexDirection: "column", gap: "var(--space-sm)" }}
      >
        <label className="field">
          <span style={{ fontSize: "var(--text-sm)", fontWeight: 500, color: "var(--color-ink)" }}>
            Unit code
          </span>
          <input
            ref={input}
            className="input mono"
            value={unitId}
            onChange={(e) => setUnitId(e.target.value)}
            required
            autoFocus
            placeholder="550e8400-e29b-41d4-a716-446655440000"
            pattern="[0-9a-fA-F-]{36}"
          />
          <span style={{ fontSize: "var(--text-xs)", color: "var(--color-ink-3)" }}>
            Scan the QR on the box, or type the code. Nothing about the customer is
            recorded.
          </span>
        </label>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "var(--space-sm)",
            flexWrap: "wrap",
          }}
        >
          <button type="submit" className="btn btn--primary">
            Dispense
          </button>

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

      <dialog ref={ref} className="modal" aria-labelledby={titleId}>
        <form action={formAction} className="modal__body">
          <h2 id={titleId} className="modal__title">
            Dispense this unit?
          </h2>
          <p className="modal__lede">
            This is permanent. Once dispensed, the code is spent — any later scan of this
            box will report it as already sold, and there is no way to undo it.
          </p>

          <input type="hidden" name="unitId" value={unitId} />

          <p className="modal__readout mono">{unitId}</p>

          {state?.error ? (
            <p role="alert" className="modal__error">
              {state.error}
            </p>
          ) : null}

          <footer className="modal__foot">
            <button
              type="button"
              className="btn"
              onClick={() => ref.current?.close()}
            >
              Cancel
            </button>
            <Confirm />
          </footer>
        </form>
      </dialog>
    </div>
  );
}
