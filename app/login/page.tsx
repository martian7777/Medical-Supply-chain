import Link from "next/link";
import { redirect } from "next/navigation";

import { userClient } from "@/lib/supabase/server";

export const metadata = {
  title: "Sign in · MSWP",
  description: "Operator sign-in for the Medical Supply Web Project.",
};

/**
 * Sign-in. Two kinds of person arrive here: an administrator who registered their
 * organisation at /signup and is waiting to be approved, and a member of staff who was
 * invited into an organisation that already exists. Nobody has an account that belongs
 * to no organisation — see lib/services/signup.ts.
 */

async function signIn(formData: FormData) {
  "use server";

  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "/dashboard");

  const supabase = await userClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    // Never distinguish "no such user" from "wrong password" — that turns the login
    // form into an oracle for which email addresses are registered.
    redirect(`/login?error=1&next=${encodeURIComponent(next)}`);
  }

  redirect(next);
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  const params = await searchParams;

  return (
    <main className="auth">
      <div className="auth__col">
        <Link
          href="/"
          style={{
            fontFamily: "var(--font-display)",
            fontWeight: 600,
            letterSpacing: "-0.02em",
            color: "var(--color-ink)",
          }}
        >
          MSWP
        </Link>

        <div className="auth__panel">
          <h1 style={{ fontSize: "var(--text-2xl)" }}>Sign in</h1>
          <p
            style={{
              marginTop: "var(--space-2xs)",
              fontSize: "var(--text-sm)",
              color: "var(--color-ink-3)",
            }}
          >
            Operator access to the supply record.
          </p>

          <form
            action={signIn}
            style={{
              marginTop: "var(--space-lg)",
              display: "flex",
              flexDirection: "column",
              gap: "var(--space-md)",
            }}
          >
            <input type="hidden" name="next" value={params.next ?? "/dashboard"} />

            <label className="field">
              <span style={{ fontSize: "var(--text-sm)", fontWeight: 500 }}>Email</span>
              <input
                name="email"
                type="email"
                required
                autoComplete="username"
                className="input"
                aria-invalid={params.error ? true : undefined}
              />
            </label>

            <label className="field">
              <span style={{ fontSize: "var(--text-sm)", fontWeight: 500 }}>
                Password
              </span>
              <input
                name="password"
                type="password"
                required
                autoComplete="current-password"
                className="input"
                aria-invalid={params.error ? true : undefined}
              />
            </label>

            {params.error ? (
              <p
                role="alert"
                style={{ fontSize: "var(--text-sm)", color: "var(--color-danger)" }}
              >
                Those credentials were not recognised.
              </p>
            ) : null}

            <button type="submit" className="btn btn--primary">
              Sign in
            </button>
          </form>
        </div>

        <div className="auth__meta">
          <p>
            Forgotten your password?{" "}
            <Link href="/forgot-password">Get a link to reset it</Link>.
          </p>
          <p>
            No account? <Link href="/signup">Register your organization</Link> — or ask
            its administrator to invite you. <Link href="/access">How access works</Link>.
          </p>
          <p>
            Checking a medicine needs no account —{" "}
            <Link href="/verify">use the public check</Link>.
          </p>
        </div>
      </div>
    </main>
  );
}
