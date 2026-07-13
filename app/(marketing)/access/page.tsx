import Link from "next/link";

export const metadata = {
  title: "How access works · MSWP",
  description:
    "Accounts on the Medical Supply Web Project are issued by invitation through a registered organisation. There is no self-serve registration.",
};

/**
 * There is deliberately no self-serve sign-up form (see app/login/page.tsx): every
 * account belongs to an organisation with a seat in the chain, and organisations are
 * registered by the regulator. This page answers "how do I get in?" honestly instead
 * of collecting accounts that can never be attached to an organisation.
 */

const STEPS: Array<{ num: string; title: string; body: string }> = [
  {
    num: "1.0",
    title: "Your organisation is registered.",
    body: "The regulator registers each manufacturer and pharmacy in the system, with its legal identity and its role in the chain. To start this, contact the regulatory body that oversees medicinal products in your market.",
  },
  {
    num: "2.0",
    title: "Your first administrator is invited.",
    body: "Once the organisation exists, its first administrator is invited to create an account. That account is bound to the organisation — every licence issued, unit serialized, shipment sent and unit dispensed is attributed to it.",
  },
  {
    num: "3.0",
    title: "Administrators invite their staff.",
    body: "Your administrator invites operators and clerks from inside the console, each with the role they actually need. Nobody in the system holds an account that belongs to no one.",
  },
];

export default function AccessPage() {
  return (
    <article className="doc">
      <header className="doc__head">
        <h1>Access is by invitation.</h1>
        <p className="doc__standfirst">
          Every account on MSWP belongs to an organisation with a seat in the supply
          chain — a regulator, a manufacturer, or a pharmacy. There is no open
          registration form, because an account that belongs to no organisation has no
          role we could trust it with.
        </p>
      </header>

      <div className="prose">
        {STEPS.map((step) => (
          <section key={step.num} style={{ marginTop: "var(--space-2xl)" }}>
            <span className="stage__num">{step.num}</span>
            <h2 style={{ marginTop: 0, paddingTop: 0, border: 0 }}>{step.title}</h2>
            <p>{step.body}</p>
          </section>
        ))}

        <h2>Why there is no sign-up form</h2>
        <p>
          A supply record is only worth reading if every entry in it is attributable. A
          self-serve form would let anyone create an account with no organisation
          behind it — a person who could not lawfully issue a licence, serialize a unit,
          or dispense a box. Rather than create accounts with no seat and then refuse
          them everything, we don&apos;t create them at all.
        </p>
        <p>
          This is also why the roles are fixed. A pharmacy clerk cannot issue a licence
          and never sees the button; a manufacturer cannot dispense to a citizen. Each
          console shows only what its organisation is permitted to do.
        </p>

        <h2>If you are a citizen</h2>
        <p>
          You never need an account. Checking that a box of medicine is genuine is a{" "}
          <Link href="/verify">public page</Link> — scan the code, read the verdict.
          Nothing is asked of you and nothing about you is stored.
        </p>
      </div>

      <div
        className="cta-strip"
        style={{
          borderTopWidth: "1px",
          borderTopColor: "var(--color-rule-2)",
          marginTop: "var(--space-2xl)",
        }}
      >
        <div style={{ display: "flex", gap: "var(--space-sm)", flexWrap: "wrap" }}>
          <Link href="/login" className="btn btn--primary">
            Already invited? Sign in
          </Link>
          <Link href="/contact" className="btn">
            Ask about access
          </Link>
        </div>
      </div>
    </article>
  );
}
