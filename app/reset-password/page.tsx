import Link from "next/link";
import { redirect } from "next/navigation";

import { userClient } from "@/lib/supabase/server";

export const metadata = {
  title: "Choose a password · MSWP",
};

/**
 * Choose a password. Reached two ways, and deliberately the same page for both:
 *
 *   · an invited colleague following their invitation for the first time
 *   · someone who forgot their password and asked for a link
 *
 * Both arrive here via /auth/callback, which has already exchanged the emailed code for
 * a real session. So this page needs no token of its own — if there is no session, the
 * link was not followed, and there is nothing to authorise the change.
 */

async function setPassword(formData: FormData) {
  "use server";

  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  if (password !== confirm) {
    redirect("/reset-password?error=mismatch");
  }
  // Supabase enforces its own minimum too; stating ours up front means the user finds
  // out before they submit rather than from a server round-trip.
  if (password.length < 10) {
    redirect("/reset-password?error=short");
  }

  const supabase = await userClient();
  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    redirect("/reset-password?error=failed");
  }

  redirect("/dashboard");
}

const MESSAGES: Record<string, string> = {
  mismatch: "Those two passwords are not the same.",
  short: "Use at least 10 characters.",
  failed: "That password was not accepted. Try a longer, less common one.",
};

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;

  // The middleware already bounces anonymous visitors, but a session could have expired
  // between the click and the render. Send them for a fresh link rather than showing a
  // form whose submit can only fail.
  const supabase = await userClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/forgot-password?expired=1");

  const message = params.error ? MESSAGES[params.error] : undefined;

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
          <h1 style={{ fontSize: "var(--text-2xl)" }}>Choose a password</h1>
          <p
            style={{
              marginTop: "var(--space-2xs)",
              fontSize: "var(--text-sm)",
              color: "var(--color-ink-3)",
            }}
          >
            For {user.email}. At least 10 characters — this account can move real
            medicine.
          </p>

          <form
            action={setPassword}
            style={{
              marginTop: "var(--space-lg)",
              display: "flex",
              flexDirection: "column",
              gap: "var(--space-md)",
            }}
          >
            <label className="field">
              <span style={{ fontSize: "var(--text-sm)", fontWeight: 500 }}>
                New password
              </span>
              <input
                name="password"
                type="password"
                required
                minLength={10}
                autoComplete="new-password"
                className="input"
                aria-invalid={message ? true : undefined}
              />
            </label>

            <label className="field">
              <span style={{ fontSize: "var(--text-sm)", fontWeight: 500 }}>
                Again
              </span>
              <input
                name="confirm"
                type="password"
                required
                minLength={10}
                autoComplete="new-password"
                className="input"
                aria-invalid={message ? true : undefined}
              />
            </label>

            {message ? (
              <p
                role="alert"
                style={{ fontSize: "var(--text-sm)", color: "var(--color-danger)" }}
              >
                {message}
              </p>
            ) : null}

            <button type="submit" className="btn btn--primary">
              Set password and continue
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
