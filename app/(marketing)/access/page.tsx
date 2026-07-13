import Link from "next/link";

export const metadata = {
  title: "How access works · MSWP",
  description:
    "Register your organisation on the Medical Supply Web Project, get approved by the regulator, and invite your staff. Citizens never need an account.",
};

/**
 * How somebody actually gets in. Three routes, and which one applies to you is a fact
 * about who you are — not a menu.
 */

const STEPS: Array<{ num: string; title: string; body: string }> = [
  {
    num: "1.0",
    title: "You register your organisation.",
    body: "A manufacturer, a pharmacy or a regulator. You give its registered name and number, and you become its first administrator. The account and the organisation are created together — there is no moment at which you hold an account that belongs to nobody.",
  },
  {
    num: "2.0",
    title: "The regulator approves it.",
    body: "Registering is a claim, not a seat. Until a regulator has checked who you are, you can sign in and see that you are waiting, and nothing else — no licence, no serialization, no dispensing. An organisation nobody has verified has no business moving medicine.",
  },
  {
    num: "3.0",
    title: "You invite your staff.",
    body: "Once approved, you invite operators and clerks from the People page inside the console, each with the role they actually need. They receive a link and choose their own password. Staff never register themselves — they are always attached to an organisation from the moment their account exists.",
  },
];

export default function AccessPage() {
  return (
    <article className="doc">
      <header className="doc__head">
        <h1>How access works.</h1>
        <p className="doc__standfirst">
          Every account on MSWP belongs to an organisation with a seat in the supply
          chain — a regulator, a manufacturer, or a pharmacy. You can register that
          organisation yourself; what you cannot do is act in the chain until the
          regulator has approved it.
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

        <h2>Why approval, and not just a sign-up form</h2>
        <p>
          A supply record is only worth reading if every entry in it is attributable. If
          anyone could register a manufacturer and start serializing units, the public
          verification page would be telling citizens that a stranger&apos;s codes are
          genuine — which is precisely the counterfeit this system exists to catch. So
          registration is open to anyone, and approval is not.
        </p>
        <p>
          This is also why the roles are fixed. A pharmacy clerk cannot issue a licence
          and never sees the button; a manufacturer cannot dispense to a citizen. Each
          console shows only what its organisation is permitted to do.
        </p>

        <h2>If you are joining an organisation already on MSWP</h2>
        <p>
          Do not register it again — the name is taken, and a second copy of your employer
          would split its records in two. Ask your administrator to invite you from the
          People page. You will get a link and choose your own password.
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
          <Link href="/signup" className="btn btn--primary">
            Register your organisation
          </Link>
          <Link href="/login" className="btn">
            Sign in
          </Link>
          <Link href="/contact" className="btn">
            Ask about access
          </Link>
        </div>
      </div>
    </article>
  );
}
