import Link from "next/link";

export const metadata = {
  title: "Privacy · MSWP",
  description:
    "What the Medical Supply Web Project records, why, how long it is kept, and what the public verification page does and does not reveal.",
};

/**
 * Written from the system's actual behaviour (docs/07-non-functional-requirements.md:
 * data minimisation, audit trail on every business event, 5–10 year pharmaceutical
 * retention, verification response must not expose more than the authenticity check
 * requires). It is NOT a lawyer's document and says so — the notice is load-bearing,
 * not decoration. Do not remove it without replacing this text with counsel-reviewed
 * copy for the operating jurisdiction.
 */

export default function PrivacyPage() {
  return (
    <article className="doc">
      <header className="doc__head">
        <h1>Privacy notice</h1>
        <p className="doc__standfirst">
          What MSWP records, why it records it, how long it is kept, and what the public
          verification page does and does not reveal about you.
        </p>
        <p className="doc__updated label" style={{ textTransform: "none" }}>
          Draft · under review
        </p>
      </header>

      <div className="prose">
        <div className="notice" role="note">
          <p>
            <strong>This is a draft, not a legal instrument.</strong> MSWP is under
            development and this notice has not been reviewed by counsel or bound to a
            jurisdiction, a data controller, or a supervisory authority. It describes
            the system&apos;s intended data handling so that it can be reviewed — it
            should not be relied on as a published privacy policy, and it must be
            replaced before the system processes real patient data.
          </p>
        </div>

        <h2>The short version</h2>
        <ul>
          <li>
            Checking a medicine is anonymous. You do not sign in, and we do not ask who
            you are.
          </li>
          <li>
            The record is mostly about <em>boxes and organisations</em>, not people:
            drug types, licences, unit serial numbers, and custody transfers between
            companies.
          </li>
          <li>
            Personal data is minimised by design. Where the law requires a dispensing
            record to identify a patient, that identifier is held for the regulator —
            not shown on the public check.
          </li>
          <li>
            Pharmaceutical records are kept for years because the law requires it. That
            limits what can be erased on request.
          </li>
        </ul>

        <h2>What is recorded</h2>
        <h3>About organisations and their staff</h3>
        <p>
          For each registered organisation: its legal identity, its role in the chain
          (regulator, manufacturer, pharmacy), and its licences. For each operator
          account: an email address, a role, and the organisation it belongs to.
        </p>
        <p>
          Every business event — a drug type registered, a licence issued or revoked, a
          unit serialized, a shipment sent or accepted, a unit dispensed — is written to
          an audit trail with a timestamp and the identity of the account that performed
          it. This is the point of the system. An operator acting inside MSWP should
          expect their actions to be attributable to them and to their employer,
          indefinitely.
        </p>

        <h3>About medicines</h3>
        <p>
          Drug types, licences, batches, and a unique identifier for every individual
          unit, along with the full history of that unit&apos;s custody: who made it,
          who held it, when it moved, and when it was dispensed.
        </p>

        <h3>About patients</h3>
        <p>
          Data about patients is kept to the minimum the law requires. Where a
          prescription-only medicine is dispensed, the dispensing record may carry a
          patient or prescription identifier so that regulators can audit that the rules
          were followed. It is not part of the public verification response and is not
          disclosed to manufacturers.
        </p>

        <h3>About people who check a box</h3>
        <p>
          The <Link href="/verify">verification page</Link> requires no account and asks
          for nothing about you. It takes a unit identifier and returns a verdict.
          Standard server logs may record the request for security and abuse-prevention
          purposes; they are not used to build a profile of you and are not linked to
          the medicine you checked in any record we keep about people.
        </p>

        <h2>What the public check reveals</h2>
        <p>
          The verification response is deliberately narrow: whether the unit exists on
          the record, whether it was made under a valid licence, its custody history at
          the level of <em>organisations</em>, and whether anything is wrong with it —
          revoked licence, already dispensed, reported stolen.
        </p>
        <p>
          It does not reveal who a medicine was dispensed to. A unit identifier printed
          on a box is not a secret — anyone who has held the box has seen it — so the
          check must never turn that identifier into a way of learning about the patient
          who received it.
        </p>

        <h2>Why we hold it</h2>
        <ul>
          <li>
            <strong>To operate the supply record</strong> — the system cannot establish
            that a medicine is genuine without knowing who made it and who held it.
          </li>
          <li>
            <strong>To meet regulatory obligations</strong> — licensing, traceability,
            and dispensing rules are legal requirements placed on the organisations in
            the chain.
          </li>
          <li>
            <strong>To protect patients</strong> — detecting counterfeits and enabling
            recalls is the reason the record exists.
          </li>
        </ul>

        <h2>How long it is kept</h2>
        <p>
          Pharmaceutical records are subject to statutory retention — typically measured
          in years, not months, and commonly in the range of five to ten years depending
          on the jurisdiction and record type. Licences, unit histories, custody
          transfers, and dispensing records are retained for at least as long as the
          applicable law requires.
        </p>
        <p>
          Backups are taken periodically and rotated on a defined schedule, so a deleted
          record may persist in backup media for a period after deletion.
        </p>

        <h2>Who can see what</h2>
        <ul>
          <li>
            <strong>The regulator</strong> sees the whole chain. That is its statutory
            function.
          </li>
          <li>
            <strong>A manufacturer</strong> sees its own licences, batches, units, and
            the shipments it sent.
          </li>
          <li>
            <strong>A pharmacy</strong> sees the stock it holds, the shipments it
            received, and what it dispensed.
          </li>
          <li>
            <strong>The public</strong> sees only the verification response described
            above.
          </li>
        </ul>
        <p>
          Access is enforced by the system, not by policy alone: an account is bound to
          one organisation and one role, and the consoles do not offer actions the role
          cannot lawfully take.
        </p>

        <h2>Your rights</h2>
        <p>
          Depending on your jurisdiction you may have the right to ask what personal data
          is held about you, to have it corrected, to object to certain processing, and
          in some circumstances to have it erased. Erasure is the one that most often
          cannot be granted here: a dispensing record that a regulator is legally
          required to be able to audit cannot be deleted because a party to it would
          prefer that it were.
        </p>
        <p>
          To make a request, see <Link href="/contact">contact</Link>.
        </p>

        <h2>Security</h2>
        <p>
          Traffic is encrypted in transit. Access is authenticated and role-scoped.
          Business events are written to an append-oriented audit trail so that a record
          cannot be quietly rewritten. If you believe you have found a security issue,
          please report it privately — see <Link href="/contact">contact</Link>.
        </p>

        <h2>Changes</h2>
        <p>
          This notice will change substantially before the system handles real patient
          data — it is a draft published for review, and the date above says so.
        </p>
      </div>
    </article>
  );
}
