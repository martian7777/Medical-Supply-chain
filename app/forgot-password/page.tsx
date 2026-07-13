import Link from "next/link";
import { redirect } from "next/navigation";

import { userClient } from "@/lib/supabase/server";

export const metadata = {
  title: "Reset your password · MSWP",
  description: "Request a link to set a new password for your MSWP operator account.",
};

/**
 * The way back in.
 *
 * Access is by invitation and there is no sign-up, which means an operator who forgets
 * their password previously had no path at all — their only recourse was for someone to
 * run a service-role script against the auth server. For a pharmacist who cannot dispense
 * on a Monday morning, that is not a recovery story.
 */

async function requestReset(formData: FormData) {
  "use server";

  const email = String(formData.get("email") ?? "").trim();
  const supabase = await userClient();
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "";

  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${site}/auth/callback?next=/reset-password`,
  });

  // Always the same answer, whether or not that address exists. Anything else turns this
  // form into an oracle for which addresses hold accounts — the same reason /login never
  // distinguishes "no such user" from "wrong password".
  redirect("/forgot-password?sent=1");
}

export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ sent?: string; expired?: string }>;
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
          <h1 style={{ fontSize: "var(--text-2xl)" }}>Reset your password</h1>

          {params.sent ? (
            <p
              role="status"
              style={{
                marginTop: "var(--space-md)",
                fontSize: "var(--text-sm)",
                color: "var(--color-ink-2)",
              }}
            >
              If that address holds an account, a link is on its way. It expires shortly,
              and it can only be used once.
            </p>
          ) : (
            <>
              {params.expired ? (
                <p
                  role="alert"
                  style={{
                    marginTop: "var(--space-sm)",
                    fontSize: "var(--text-sm)",
                    color: "var(--color-danger)",
                  }}
                >
                  That link has expired or was already used. Ask for a new one.
                </p>
              ) : (
                <p
                  style={{
                    marginTop: "var(--space-2xs)",
                    fontSize: "var(--text-sm)",
                    color: "var(--color-ink-3)",
                  }}
                >
                  We will email you a link to choose a new one.
                </p>
              )}

              <form
                action={requestReset}
                style={{
                  marginTop: "var(--space-lg)",
                  display: "flex",
                  flexDirection: "column",
                  gap: "var(--space-md)",
                }}
              >
                <label className="field">
                  <span style={{ fontSize: "var(--text-sm)", fontWeight: 500 }}>
                    Email
                  </span>
                  <input
                    name="email"
                    type="email"
                    required
                    autoComplete="username"
                    className="input"
                  />
                </label>

                <button type="submit" className="btn btn--primary">
                  Send the link
                </button>
              </form>
            </>
          )}
        </div>

        <div className="auth__meta">
          <p>
            Remembered it? <Link href="/login">Sign in</Link>.
          </p>
          <p>
            Never had an account? Access is by invitation —{" "}
            <Link href="/access">how access works</Link>.
          </p>
        </div>
      </div>
    </main>
  );
}
