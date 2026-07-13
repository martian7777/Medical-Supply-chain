import Link from "next/link";
import { redirect } from "next/navigation";

import { DomainError } from "@/lib/domain/errors";
import { signUpOrganization } from "@/lib/services/signup";

export const metadata = {
  title: "Register your organization · MSWP",
  description:
    "Register a manufacturer, pharmacy or regulator on the Medical Supply Web Project. Registrations are approved by the regulator before an organization can act.",
};

/**
 * Sign-up — for an ORGANISATION, not for a person on their own.
 *
 * The account and the organisation are created together and cannot exist apart. What
 * signing up buys you is a pending claim: you can sign in, and you can see that you are
 * waiting. The regulator approves you, and only then does anything else become possible.
 *
 * Staff do not sign up. Once an organisation is approved, its administrator invites
 * colleagues from the People page — that is how someone joins an organisation that
 * already exists, and it is why this form always creates a new one.
 */

async function signUp(formData: FormData) {
  "use server";

  const str = (k: string) => String(formData.get(k) ?? "").trim();

  let result;
  try {
    result = await signUpOrganization({
      email: str("email"),
      password: String(formData.get("password") ?? ""),
      orgType: str("orgType"),
      orgName: str("orgName"),
      registrationNo: str("registrationNo") || undefined,
    });
  } catch (e) {
    if (e instanceof DomainError) {
      redirect(`/signup?error=${encodeURIComponent(e.message)}`);
    }
    throw e;
  }

  if (result.needsEmailConfirmation) {
    redirect("/signup?confirm=1");
  }

  // Approved on the spot only in the bootstrap case — the very first regulator. Everyone
  // else goes to the page that tells them they are waiting.
  redirect(result.status === "active" ? "/dashboard" : "/pending");
}

const KINDS: Array<{ value: string; label: string; blurb: string }> = [
  {
    value: "manufacturer",
    label: "Manufacturer",
    blurb: "You make medicine and serialize it into units.",
  },
  {
    value: "pharmacy",
    label: "Pharmacy",
    blurb: "You receive medicine and dispense it to the public.",
  },
  {
    value: "government",
    label: "Regulator",
    blurb: "You license manufacturers and oversee the chain.",
  },
];

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; confirm?: string }>;
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
          {params.confirm ? (
            <>
              <h1 style={{ fontSize: "var(--text-2xl)" }}>Confirm your address</h1>
              <p
                role="status"
                style={{
                  marginTop: "var(--space-md)",
                  fontSize: "var(--text-sm)",
                  color: "var(--color-ink-2)",
                }}
              >
                Your organization is registered and we have emailed you a link. Follow it
                to finish signing in. The regulator reviews your registration before you
                can act in the chain.
              </p>
            </>
          ) : (
            <>
              <h1 style={{ fontSize: "var(--text-2xl)" }}>Register your organization</h1>
              <p
                style={{
                  marginTop: "var(--space-2xs)",
                  fontSize: "var(--text-sm)",
                  color: "var(--color-ink-3)",
                }}
              >
                You are registering the organization and becoming its administrator. The
                regulator approves it before it can issue, ship or dispense anything.
              </p>

              <form
                action={signUp}
                style={{
                  marginTop: "var(--space-lg)",
                  display: "flex",
                  flexDirection: "column",
                  gap: "var(--space-md)",
                }}
              >
                <fieldset
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "var(--space-xs)",
                    border: 0,
                  }}
                >
                  <legend
                    style={{
                      fontSize: "var(--text-sm)",
                      fontWeight: 500,
                      color: "var(--color-ink)",
                      marginBottom: "var(--space-2xs)",
                    }}
                  >
                    What kind of organization?
                  </legend>

                  {KINDS.map((k, i) => (
                    <label key={k.value} className="modal__pick">
                      <input
                        type="radio"
                        name="orgType"
                        value={k.value}
                        required
                        defaultChecked={i === 0}
                      />
                      <span style={{ color: "var(--color-ink)", fontWeight: 500 }}>
                        {k.label}
                      </span>
                      <span
                        style={{
                          color: "var(--color-ink-3)",
                          fontSize: "var(--text-xs)",
                        }}
                      >
                        {k.blurb}
                      </span>
                    </label>
                  ))}
                </fieldset>

                <label className="field">
                  <span style={{ fontSize: "var(--text-sm)", fontWeight: 500 }}>
                    Registered name
                  </span>
                  <input name="orgName" className="input" required maxLength={200} />
                </label>

                <label className="field">
                  <span style={{ fontSize: "var(--text-sm)", fontWeight: 500 }}>
                    Registration number
                  </span>
                  <input name="registrationNo" className="input mono" maxLength={100} />
                  <span
                    style={{ fontSize: "var(--text-xs)", color: "var(--color-ink-3)" }}
                  >
                    Optional, but the regulator will look for it when approving you.
                  </span>
                </label>

                <label className="field">
                  <span style={{ fontSize: "var(--text-sm)", fontWeight: 500 }}>
                    Your email
                  </span>
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
                    minLength={10}
                    autoComplete="new-password"
                    className="input"
                  />
                  <span
                    style={{ fontSize: "var(--text-xs)", color: "var(--color-ink-3)" }}
                  >
                    At least 10 characters.
                  </span>
                </label>

                {params.error ? (
                  <p
                    role="alert"
                    style={{ fontSize: "var(--text-sm)", color: "var(--color-danger)" }}
                  >
                    {params.error}
                  </p>
                ) : null}

                <button type="submit" className="btn btn--primary">
                  Register and create my account
                </button>
              </form>
            </>
          )}
        </div>

        <div className="auth__meta">
          <p>
            Already registered? <Link href="/login">Sign in</Link>.
          </p>
          <p>
            Joining an organization that is already on MSWP? Its administrator invites you
            — <Link href="/access">how access works</Link>.
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
