import Link from "next/link";

export default function Home() {
  return (
    <main
      style={{
        maxWidth: "42rem",
        margin: "0 auto",
        padding: "var(--space-3xl) var(--space-lg)",
        display: "flex",
        flexDirection: "column",
        gap: "var(--space-lg)",
      }}
    >
      <div>
        <h1 style={{ fontSize: "var(--text-3xl)", lineHeight: 1.15 }}>
          Every pack, from the plant to the counter.
        </h1>
        <p
          style={{
            marginTop: "var(--space-sm)",
            fontSize: "var(--text-lg)",
            color: "var(--color-ink-2)",
          }}
        >
          Licences, serialized units, custody transfers, and a public check that anyone
          can run on any box.
        </p>
      </div>

      <div style={{ display: "flex", gap: "var(--space-sm)", flexWrap: "wrap" }}>
        <Link href="/verify" className="btn btn--primary">
          Check a medicine
        </Link>
        <Link href="/login" className="btn">
          Sign in
        </Link>
      </div>
    </main>
  );
}
