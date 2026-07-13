import type { ReactNode } from "react";

/**
 * Shared primitives for the operator register.
 *
 * Deliberately small. A regulatory console needs a table, a chip, a panel and a
 * button; every extra abstraction here is a thing that drifts from the tokens.
 */

export function Panel({
  title,
  action,
  children,
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="panel">
      <header className="panel__head">
        <h2 style={{ fontSize: "var(--text-lg)" }}>{title}</h2>
        {action}
      </header>
      {children}
    </section>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return (
    <p
      style={{
        padding: "var(--space-xl) var(--space-md)",
        color: "var(--color-ink-3)",
        fontSize: "var(--text-sm)",
        textAlign: "center",
      }}
    >
      {children}
    </p>
  );
}

type ChipTone = "ok" | "warn" | "danger" | "neutral" | "accent";

/**
 * Status is carried by colour AND text, never colour alone — roughly 1 in 12 men
 * cannot separate the green from the red, and "is this batch recalled?" is not a
 * question to answer with a hue.
 */
export function Chip({ tone, children }: { tone: ChipTone; children: ReactNode }) {
  return <span className={`chip chip--${tone}`}>{children}</span>;
}

const UNIT_TONE: Record<string, ChipTone> = {
  active: "ok",
  in_transit: "accent",
  dispensed: "neutral",
  expired: "warn",
  recalled: "danger",
};

export function UnitStatus({ status }: { status: string }) {
  return (
    <Chip tone={UNIT_TONE[status] ?? "neutral"}>{status.replace("_", " ")}</Chip>
  );
}

/** A unit id is 36 characters. Show enough to compare against a box, not all of it. */
export function Uuid({ value, full = false }: { value: string; full?: boolean }) {
  return (
    <span className="mono" title={value} style={{ fontSize: "var(--text-xs)" }}>
      {full ? value : `${value.slice(0, 8)}…${value.slice(-4)}`}
    </span>
  );
}

/**
 * Errors state what happened and what to do about it — never "an error occurred".
 * The domain layer's messages are already written this way, so they pass straight
 * through.
 */
export function ErrorNote({ children }: { children: ReactNode }) {
  return (
    <p
      role="alert"
      style={{
        margin: "var(--space-sm) var(--space-md)",
        padding: "var(--space-xs) var(--space-sm)",
        borderLeft: "2px solid var(--color-danger)",
        background: "var(--color-danger-weak)",
        color: "var(--color-danger)",
        fontSize: "var(--text-sm)",
        borderRadius: "var(--radius-sm)",
      }}
    >
      {children}
    </p>
  );
}
