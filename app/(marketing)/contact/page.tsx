import Link from "next/link";

export const metadata = {
  title: "Contact · MSWP",
  description:
    "How to reach the Medical Supply Web Project — for organisations seeking access, for regulators, and for reporting a suspect medicine.",
};

/**
 * Deliberately no contact FORM. A form implies a mailbox someone is watching and an
 * SLA someone is keeping; neither exists yet, and a form that silently drops a report
 * of a counterfeit medicine is worse than no form. Real addresses are placeholders
 * until the operating entity is settled — see the notice, which is meant to be
 * removed along with the placeholders.
 */

const PLACEHOLDER = "— to be confirmed —";

export default function ContactPage() {
  return (
    <article className="doc">
      <header className="doc__head">
        <h1>Contact</h1>
        <p className="doc__standfirst">
          Who to reach, depending on why you are here. There is no contact form on this
          page on purpose: a form implies a mailbox someone is watching, and we would
          rather point you at the right destination than absorb your message.
        </p>
      </header>

      <div className="prose">
        <div className="notice" role="note">
          <p>
            <strong>Placeholder contact details.</strong> MSWP is under active
            development and the operating entity&apos;s published channels are not yet
            settled. The addresses below are marked{" "}
            <span className="mono">{PLACEHOLDER}</span> until they are.
          </p>
          <p>
            If you are holding a medicine you believe is counterfeit, do not wait for
            us — contact the pharmacy that supplied it and your national medicines
            regulator.
          </p>
        </div>

        <h2>You think a medicine is fake</h2>
        <p>
          Start with the <Link href="/verify">public check</Link>. Scan the code on the
          box; the page will tell you whether the unit is on the record, who made it,
          and whether anything about its history looks wrong.
        </p>
        <p>
          If the check comes back as anything other than genuine — or if the box has no
          code at all — report it to the pharmacy that dispensed it and to your national
          medicines regulator. They can act; a web page cannot.
        </p>

        <h2>Your organisation wants access</h2>
        <p>
          Accounts are issued through a registered organisation, not requested
          individually — read <Link href="/access">how access works</Link> first, because
          it will probably answer your question. If it does not, the route in is your
          national regulatory body for medicinal products, which registers manufacturers
          and pharmacies in the system.
        </p>
        <p>
          Partnership and integration enquiries:{" "}
          <span className="mono">{PLACEHOLDER}</span>
        </p>

        <h2>You are a regulator</h2>
        <p>
          Enquiries about deploying MSWP as the regulatory system for a market, and
          about the oversight console:{" "}
          <span className="mono">{PLACEHOLDER}</span>
        </p>

        <h2>You have found a security issue</h2>
        <p>
          Please report it privately and give us a reasonable window to fix it before
          disclosing. Do not test against production data, and do not access records
          that are not yours.
        </p>
        <p>
          Security contact: <span className="mono">{PLACEHOLDER}</span>
        </p>

        <h2>Data protection</h2>
        <p>
          For requests about personal data held in the system — access, correction,
          erasure where the law allows it — see the{" "}
          <Link href="/privacy">privacy notice</Link>, which sets out what is held and
          what can be erased. Note that pharmaceutical records are subject to statutory
          retention and generally cannot be deleted on request.
        </p>
      </div>
    </article>
  );
}
