import Link from "next/link";

export const metadata = {
  title: "About · MSWP",
  description:
    "What the Medical Supply Web Project is, the problem it addresses, and the scope of the first release.",
};

export default function AboutPage() {
  return (
    <article className="doc">
      <header className="doc__head">
        <h1>A single record, from the plant to the counter.</h1>
        <p className="doc__standfirst">
          The Medical Supply Web Project (MSWP) is a system for tracking medicines
          through the supply chain — from the licence a drug is made under, to the
          serial number on the box, to the moment it is handed to a patient.
        </p>
      </header>

      <div className="prose">
        <h2>The problem</h2>
        <p>
          Once a medicine leaves a factory, its history becomes hard to establish. A
          regulator cannot easily see who handled a given box. A pharmacy cannot always
          prove where its stock came from. And a patient holding a box has no way at all
          to tell a genuine medicine from a counterfeit one.
        </p>
        <p>
          Counterfeit and substandard medicines enter the chain through exactly those
          gaps. The response is not more paperwork — it is one shared record that every
          party writes to and anyone can check.
        </p>

        <h2>How it works</h2>
        <p>
          Every medicine unit has one identity and one traceable history. Licences are
          issued by the regulator and can be revoked. Units are serialized by licensed
          manufacturers. Custody transfers are recorded when stock moves. Dispensing
          closes the chain. And a public verification page turns the whole record into a
          single answer for the person holding the box.
        </p>
        <p>
          The five stages are set out in order on the{" "}
          <Link href="/">home page</Link>.
        </p>

        <h2>Who uses it</h2>
        <ul>
          <li>
            <strong>Government</strong> — the regulatory body that registers drug types,
            issues and revokes licences, and oversees the chain.
          </li>
          <li>
            <strong>Manufacturers</strong> — licensed producers who register batches,
            serialize units, and ship to pharmacies.
          </li>
          <li>
            <strong>Pharmacies</strong> — retailers who receive stock, dispense by the
            rules, and resolve disputes.
          </li>
          <li>
            <strong>Citizens</strong> — anyone who wants to check a box. Read-only, and
            no account required.
          </li>
        </ul>

        <h2>What the first release covers</h2>
        <p>
          The initial release covers drug type registration, licence issuance and
          lifecycle, serialized unit registration, custody transfer from manufacturer to
          pharmacy and pharmacy to citizen, the public verification portal, and
          role-based consoles for each organisation type.
        </p>
        <p>
          Deliberately not in the first release: the full doctor-issued prescription
          workflow, IoT and cold-chain sensor integration, ERP and warehouse system
          integration, native mobile applications, and multi-regulator support. Those
          are later phases, and we would rather name them than imply they already exist.
        </p>

        <h2>Status</h2>
        <p>
          MSWP is under active development. If you represent a regulator, manufacturer,
          or pharmacy and want to talk about participating,{" "}
          <Link href="/contact">get in touch</Link> — and see{" "}
          <Link href="/access">how access works</Link>.
        </p>
      </div>
    </article>
  );
}
