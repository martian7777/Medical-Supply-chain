import Link from "next/link";

export const metadata = {
  title: "Terms · MSWP",
  description:
    "Terms of use for the Medical Supply Web Project — the public verification page and the operator consoles.",
};

/**
 * Same standing as the privacy notice: a draft that states the rules the system
 * actually enforces, not counsel-reviewed terms bound to a jurisdiction. The notice
 * must survive until real terms replace this text.
 */

export default function TermsPage() {
  return (
    <article className="doc">
      <header className="doc__head">
        <h1>Terms of use</h1>
        <p className="doc__standfirst">
          The rules for using MSWP — both the public verification page, which anyone may
          use, and the operator consoles, which are issued to organisations in the supply
          chain.
        </p>
        <p className="doc__updated label" style={{ textTransform: "none" }}>
          Draft · under review
        </p>
      </header>

      <div className="prose">
        <div className="notice" role="note">
          <p>
            <strong>This is a draft, not a contract.</strong> MSWP is under development.
            These terms have not been reviewed by counsel, are not bound to a governing
            law or jurisdiction, and are not offered by a named legal entity. They
            describe the intended rules of use so that they can be reviewed. Where an
            organisation has a signed agreement with the operator of the system, that
            agreement governs — not this page.
          </p>
        </div>

        <h2>1. What MSWP is</h2>
        <p>
          MSWP records the licensing, serialization, custody, and dispensing of medicine
          units, and offers a public check that reports what the record says about a
          given unit. It is a record-keeping and verification system. It is not a
          medical device, it does not give medical advice, and it does not test the
          physical contents of any package.
        </p>

        <h2>2. The public verification page</h2>
        <p>
          Anyone may use the <Link href="/verify">verification page</Link>, without an
          account and free of charge.
        </p>
        <p>
          Understand what a result means. A &quot;genuine&quot; verdict means the unit
          identifier is on the record and its history is consistent — it does not and
          cannot mean that the physical contents of the box are safe, correctly stored,
          or unaltered. A counterfeiter can copy a code onto a fake box; that is exactly
          why the check also reports when a unit has already been dispensed or its
          licence revoked.
        </p>
        <p>
          <strong>If in doubt, do not take the medicine.</strong> Ask the pharmacy that
          supplied it and your national medicines regulator. A verdict on this site is
          not a substitute for either.
        </p>
        <p>
          You may not scrape the verification endpoint in bulk, enumerate unit
          identifiers, or use it to test whether guessed identifiers exist. Rate limiting
          and abuse prevention apply.
        </p>

        <h2>3. Operator accounts</h2>
        <p>
          Accounts are issued to organisations, not to individuals in their own right —
          see <Link href="/access">how access works</Link>. If you hold an account:
        </p>
        <ul>
          <li>
            You act for your organisation. Every action you take is recorded against you
            and against it.
          </li>
          <li>
            You must not share credentials, and you must tell your administrator
            immediately if you believe they have been compromised.
          </li>
          <li>
            You must not attempt to act outside your role, or to access records
            belonging to organisations other than your own.
          </li>
          <li>
            You must not enter false information. Records in this system are relied upon
            by regulators and by patients; a false custody entry is not a data-entry
            error, it is a falsified pharmaceutical record.
          </li>
        </ul>
        <p>
          Accounts may be suspended where there is reason to believe these rules have
          been broken, and the regulator may revoke an organisation&apos;s licence
          independently of anything that happens on this site.
        </p>

        <h2>4. The record</h2>
        <p>
          Entries in the supply record are, by design, permanent and attributable.
          Correcting a mistake means adding a correcting entry, not erasing history.
          Retention is governed by the pharmaceutical rules of the jurisdiction, as set
          out in the <Link href="/privacy">privacy notice</Link>.
        </p>

        <h2>5. Availability</h2>
        <p>
          The system is offered as-is and without a guarantee of uninterrupted
          availability. It may be unavailable for maintenance, and — being under active
          development — it may change. Organisations that need a service level should
          agree one in writing; this page does not create one.
        </p>

        <h2>6. Liability</h2>
        <p>
          To the extent permitted by law, and except where a signed agreement says
          otherwise, MSWP is provided without warranties, and its operators are not
          liable for indirect or consequential loss arising from its use. Nothing here
          limits liability that cannot lawfully be limited — including liability for
          death or personal injury caused by negligence.
        </p>
        <p>
          This clause is precisely the kind of thing that must be drafted by counsel for
          a specific jurisdiction before this system carries real traffic. The notice at
          the top of this page is not a formality.
        </p>

        <h2>7. Changes</h2>
        <p>
          These terms will be replaced before the system is used in production. Continued
          use after they are replaced means acceptance of the replacement.
        </p>

        <h2>8. Contact</h2>
        <p>
          Questions about these terms: see <Link href="/contact">contact</Link>.
        </p>
      </div>
    </article>
  );
}
