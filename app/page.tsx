import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-24">
      <h1 className="text-3xl font-semibold tracking-tight">
        Medical Supply Web Project
      </h1>
      <p className="mt-3 text-[var(--color-muted)]">
        Drug licensing, unit serialization, custody transfer, and public
        verification.
      </p>
      <div className="mt-8 flex gap-4">
        <Link href="/verify" className="underline underline-offset-4">
          Verify a medicine
        </Link>
        <Link href="/login" className="underline underline-offset-4">
          Sign in
        </Link>
      </div>
    </main>
  );
}
