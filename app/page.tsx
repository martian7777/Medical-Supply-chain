import Link from "next/link";

import { MarketingFooter, MarketingNav } from "@/components/marketing";

/**
 * The landing page is the custody chain told in order — five numbered stages,
 * because the sequence IS the product. Each stage pairs a plain-language claim
 * with a small specimen of the actual product surface (the same panels, mono
 * readouts and labelled chips the operator consoles use). No invented metrics,
 * no testimonials — the system has nothing to claim yet except how it works.
 */

const STAGES: Array<{
  num: string;
  title: string;
  body: string;
  specimen: React.ReactNode;
}> = [
  {
    num: "1.0",
    title: "License",
    body: "The regulator registers each drug type and licenses the manufacturers allowed to produce it. A licence has a scope and an expiry, and it can be prolonged or revoked — nothing downstream happens without one.",
    specimen: (
      <div className="specimen">
        <div className="specimen__row">
          <span className="mono">amoxicillin · 500 mg capsule</span>
          <span className="chip chip--ok">licensed</span>
        </div>
        <div className="specimen__row">
          <span className="mono">insulin glargine · 100 U/ml</span>
          <span className="chip chip--ok">licensed</span>
        </div>
        <div className="specimen__row">
          <span className="mono">diazepam · 5 mg tablet</span>
          <span className="chip chip--danger">revoked</span>
        </div>
      </div>
    ),
  },
  {
    num: "2.0",
    title: "Serialize",
    body: "A licensed manufacturer registers production in batches, and every single unit in a batch gets its own identity — a UUID printed on the box as a scannable code. From this moment the box is on the record.",
    specimen: (
      <div className="specimen">
        <div className="specimen__row">
          <span className="mono">9f3c1a72-…-04d1 · lot A2231</span>
          <span className="chip chip--accent">active</span>
        </div>
        <div className="specimen__row">
          <span className="mono">b81e55c0-…-9a37 · lot A2231</span>
          <span className="chip chip--accent">active</span>
        </div>
        <div className="specimen__row">
          <span className="mono">4d20fe19-…-77b2 · lot A2231</span>
          <span className="chip chip--accent">active</span>
        </div>
      </div>
    ),
  },
  {
    num: "3.0",
    title: "Transfer",
    body: "Custody changes hands on the record. A manufacturer ships units to a pharmacy; the pharmacy accepts or disputes the shipment. Every transfer is attributed to the organisation that made it.",
    specimen: (
      <div className="specimen">
        <div className="specimen__row">
          <span className="mono">manufacturer → pharmacy · 240 units</span>
          <span className="chip chip--ok">accepted</span>
        </div>
        <div className="specimen__row">
          <span className="mono">manufacturer → pharmacy · 60 units</span>
          <span className="chip chip--warn">in transit</span>
        </div>
        <div className="specimen__row">
          <span className="mono">manufacturer → pharmacy · 12 units</span>
          <span className="chip chip--danger">disputed</span>
        </div>
      </div>
    ),
  },
  {
    num: "4.0",
    title: "Dispense",
    body: "The pharmacy sells each unit once, to a person, by the rules — prescription-only medicines are dispensed only against a prescription. Dispensing closes the unit's chain of custody.",
    specimen: (
      <div className="specimen">
        <div className="specimen__row">
          <span className="mono">unit dispensed · prescription recorded</span>
          <span className="chip chip--neutral">dispensed</span>
        </div>
        <div className="specimen__row">
          <span className="mono">second sale attempt on same unit</span>
          <span className="chip chip--danger">refused</span>
        </div>
      </div>
    ),
  },
  {
    num: "5.0",
    title: "Verify",
    body: "Anyone can point a phone at the code on any box — no account needed. The public check shows who made it, where it has been, and whether anything looks wrong.",
    specimen: (
      <div className="specimen">
        <div
          className="specimen__row"
          style={{ justifyContent: "flex-start", gap: "var(--space-sm)" }}
        >
          <span
            style={{
              fontFamily: "var(--font-display)",
              fontWeight: 600,
              fontSize: "var(--text-xl)",
              color: "var(--color-ok)",
            }}
          >
            Genuine
          </span>
          <span className="chip chip--ok">dispensed by a licensed pharmacy</span>
        </div>
        <div className="specimen__row">
          <span className="mono">made by a licensed manufacturer · 2 custody transfers · no alerts</span>
        </div>
      </div>
    ),
  },
];

export default function Home() {
  return (
    <div style={{ minHeight: "100dvh", display: "flex", flexDirection: "column" }}>
      <MarketingNav />

      <main className="mkt-main" style={{ flex: 1, width: "100%" }}>
        <section className="hero">
          <h1 className="hero__title">Every pack, from the plant to the counter.</h1>
          <div className="hero__lede">
            <p>
              MSWP keeps one shared record for every medicine unit — the licence it
              was made under, the serial number on its box, every change of custody —
              and gives anyone a public check they can run on any box.
            </p>
            <div className="hero__actions">
              <Link href="/verify" className="btn btn--primary">
                Check a medicine
              </Link>
              <Link href="/signup" className="btn">
                Get access for your organisation
              </Link>
            </div>
          </div>
        </section>

        <section id="how" aria-label="How it works">
          {STAGES.map((stage) => (
            <article key={stage.num} className="stage">
              <div>
                <span className="stage__num">{stage.num}</span>
                <h2 className="stage__title">{stage.title}</h2>
                <p className="stage__body">{stage.body}</p>
              </div>
              <figure className="panel" style={{ margin: 0 }}>
                {stage.specimen}
              </figure>
            </article>
          ))}
        </section>

        <section id="roles" aria-label="Who it is for">
          <div className="stage" style={{ display: "block" }}>
            <h2 style={{ fontSize: "var(--text-3xl)" }}>
              Built for the people who handle it.
            </h2>
          </div>
          <div className="roles" style={{ paddingTop: 0 }}>
            <div className="role">
              <h3>Government</h3>
              <p>
                Registers drug types, issues and revokes licences, and oversees every
                organisation in the chain from one regulatory console.
              </p>
            </div>
            <div className="role">
              <h3>Manufacturers</h3>
              <p>
                Register batches under a valid licence, serialize units, print the
                codes, and ship to pharmacies with custody recorded automatically.
              </p>
            </div>
            <div className="role">
              <h3>Pharmacies</h3>
              <p>
                Accept incoming shipments, dispense by the rules, and resolve disputes
                — with an inventory view that always matches the record.
              </p>
            </div>
          </div>
          <p
            style={{
              fontSize: "var(--text-sm)",
              color: "var(--color-ink-3)",
              paddingBottom: "var(--space-xl)",
            }}
          >
            Citizens don&apos;t need an account. The{" "}
            <Link
              href="/verify"
              style={{ color: "var(--color-ink-2)", textDecoration: "underline", textUnderlineOffset: "3px" }}
            >
              verification page
            </Link>{" "}
            is public, on purpose.
          </p>
        </section>

        <section className="cta-strip" aria-label="Get started">
          <h2>Holding a box right now?</h2>
          <Link href="/verify" className="btn btn--primary">
            Check a medicine
          </Link>
          <p style={{ fontSize: "var(--text-sm)", color: "var(--color-ink-3)" }}>
            Run an organisation in the chain?{" "}
            <Link
              href="/signup"
              style={{ color: "var(--color-ink-2)", textDecoration: "underline", textUnderlineOffset: "3px" }}
            >
              How access works →
            </Link>
          </p>
        </section>
      </main>

      <MarketingFooter />
    </div>
  );
}
