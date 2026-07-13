import Link from "next/link";

import { MarketingFooter, MarketingNav } from "@/components/marketing";

export const metadata = {
  title: "Get access · MSWP",
  description:
    "How organisations and their staff get accounts on the Medical Supply Web Project. Access is by invitation — there is no self-serve registration.",
};

/**
 * There is deliberately no self-serve sign-up form (see app/login/page.tsx): every
 * account belongs to an organisation with a seat in the chain, and organisations
 * are registered by the regulator. This page exists so "/signup" answers the
 * question honestly instead of 404ing or — worse — collecting accounts that can
 * never be attached to an organisation.
 */

const STEPS: Array<{ num: string; title: string; body: string }> = [
  {
    num: "01",
    title: "Your organisation is registered.",
    body: "The regulator registers each manufacturer and pharmacy in the system, with its legal identity and its role in the chain. To start this, contact the regulatory body that oversees your market.",
  },
  {
    num: "02",
    title: "Your first admin is invited.",
    body: "When the organisation is registered, its first administrator receives an invitation to create their account. That account is bound to the organisation — every action it takes is attributed to it.",
  },
  {
    num: "03",
    title: "Admins invite their staff.",
    body: "Your administrator invites clerks and operators from inside the console, each with the role they actually need. Nobody in the system holds an account that belongs to no one.",
  },
];

export default function SignupPage() {
  return (
    <div style={{ minHeight: "100dvh", display: "flex", flexDirection: "column" }}>
      <MarketingNav />

      <main
        className="mkt-main"
        style={{ flex: 1, width: "100%", maxWidth: "48rem" }}
      >
        <section className="hero" style={{ display: "block" }}>
          <h1 className="hero__title" style={{ fontSize: "var(--text-3xl)" }}>
            Access is by invitation.
          </h1>
          <p
            style={{
              marginTop: "var(--space-sm)",
              fontSize: "var(--text-lg)",
              color: "var(--color-ink-2)",
              maxWidth: "38rem",
            }}
          >
            Every account on MSWP belongs to an organisation with a seat in the supply
            chain — a regulator, a manufacturer, or a pharmacy. There is no open
            registration form, because an account that belongs to no organisation has
            no role we could trust it with.
          </p>
        </section>

        <section aria-label="How access works">
          {STEPS.map((step) => (
            <article key={step.num} className="stage" style={{ display: "block" }}>
              <span className="stage__num">{step.num}</span>
              <h2 className="stage__title" style={{ fontSize: "var(--text-xl)" }}>
                {step.title}
              </h2>
              <p className="stage__body">{step.body}</p>
            </article>
          ))}
        </section>

        <section
          className="cta-strip"
          style={{ borderTopWidth: "1px", borderTopColor: "var(--color-rule-2)" }}
          aria-label="Next steps"
        >
          <div style={{ display: "flex", gap: "var(--space-sm)", flexWrap: "wrap" }}>
            <Link href="/login" className="btn btn--primary">
              Already invited? Sign in
            </Link>
            <Link href="/verify" className="btn">
              Just checking a medicine
            </Link>
          </div>
          <p style={{ fontSize: "var(--text-sm)", color: "var(--color-ink-3)" }}>
            Checking a box never needs an account — the verification page is public.
          </p>
        </section>
      </main>

      <MarketingFooter />
    </div>
  );
}
