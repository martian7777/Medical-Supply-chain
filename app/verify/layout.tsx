import Link from "next/link";

/**
 * The public register.
 *
 * Nothing here looks like the operator console. This page is met by a worried person in
 * a shop, on a phone, in bad light, possibly for the only time in their life. It gets a
 * narrow measure, large type, generous touch targets, and exactly one thing to do.
 */
export default function VerifyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        minHeight: "100dvh",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <header
        style={{
          borderBottom: "1px solid var(--color-rule)",
          padding: "var(--space-sm) var(--space-md)",
        }}
      >
        <Link
          href="/verify"
          style={{
            fontFamily: "var(--font-display)",
            fontWeight: 600,
            color: "var(--color-ink)",
            fontSize: "var(--text-sm)",
            letterSpacing: "-0.01em",
          }}
        >
          Medicine check
        </Link>
      </header>

      <main
        style={{
          flex: 1,
          width: "100%",
          maxWidth: "34rem",
          margin: "0 auto",
          padding: "var(--space-xl) var(--space-md) var(--space-2xl)",
          display: "flex",
          flexDirection: "column",
          gap: "var(--space-lg)",
        }}
      >
        {children}
      </main>

      <footer
        style={{
          borderTop: "1px solid var(--color-rule)",
          padding: "var(--space-md)",
          textAlign: "center",
          fontSize: "var(--text-xs)",
          color: "var(--color-ink-3)",
        }}
      >
        This check does not record who you are or what you bought.
      </footer>
    </div>
  );
}
