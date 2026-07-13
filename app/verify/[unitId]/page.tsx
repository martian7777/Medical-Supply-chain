import Link from "next/link";
import { headers } from "next/headers";

import { DomainError } from "@/lib/domain/errors";
import type { PublicVerification } from "@/lib/domain/verification";
import { verifyUnit } from "@/lib/services/verification";

export const dynamic = "force-dynamic";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * The verdict.
 *
 * Three things this page refuses to do:
 *
 *  · It never names a person. There is no owner field, no buyer, no patient. The chain
 *    below is organizations only, because a buyer was never recorded in the first place.
 *
 *  · It never says only "authentic" when the scan pattern is wrong. A code photocopied
 *    onto a thousand counterfeit boxes passes a naive lookup — so a flagged unit gets
 *    a real warning, in plain words, above the reassuring green.
 *
 *  · It never shows an error to a frightened person. An unknown or malformed code is a
 *    calm "we have no record of this", not a 400 and a stack trace.
 */

type Verdict = PublicVerification["verdict"];

const VERDICT: Record<
  Verdict,
  { title: string; sub: string; bg: string; fg: string }
> = {
  authentic: {
    title: "Genuine",
    sub: "This medicine was made under licence and its history checks out.",
    bg: "var(--color-ok-weak)",
    fg: "var(--color-ok)",
  },
  flagged: {
    title: "Be careful",
    sub: "This is a real code — but it is behaving like a copied one.",
    bg: "var(--color-warn-weak)",
    fg: "var(--color-warn)",
  },
  not_found: {
    title: "No record",
    sub: "We have never issued this code. Do not take this medicine; show it to your pharmacist.",
    bg: "var(--color-danger-weak)",
    fg: "var(--color-danger)",
  },
};

export default async function VerifyResult({
  params,
}: {
  params: Promise<{ unitId: string }>;
}) {
  const { unitId } = await params;
  const h = await headers();

  let result: PublicVerification;

  if (!UUID_RE.test(unitId)) {
    result = { verdict: "not_found" };
  } else {
    try {
      result = await verifyUnit(unitId, {
        ip: h.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown",
        userAgent: h.get("user-agent") ?? "unknown",
        region: h.get("x-vercel-ip-country"),
      });
    } catch (e) {
      // Rate limited. Say so plainly — do not let it read as "the medicine is fake".
      if (e instanceof DomainError) {
        return (
          <>
            <Verdict verdict="flagged" overrideTitle="Too many checks" />
            <p style={{ fontSize: "var(--text-lg)" }}>
              You have checked a lot of codes very quickly. Wait a minute and try again —
              this is about our limits, not about your medicine.
            </p>
            <Again />
          </>
        );
      }
      throw e;
    }
  }

  const v = VERDICT[result.verdict];

  return (
    <>
      {/* The one thing readable across a shop. */}
      <div
        style={{
          background: v.bg,
          borderRadius: "var(--radius-lg)",
          padding: "var(--space-xl) var(--space-lg)",
        }}
      >
        <p
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "var(--text-verdict)",
            fontWeight: 700,
            lineHeight: 1.05,
            letterSpacing: "-0.03em",
            color: v.fg,
          }}
        >
          {v.title}
        </p>
        <p
          style={{
            marginTop: "var(--space-sm)",
            fontSize: "var(--text-lg)",
            color: "var(--color-ink)",
          }}
        >
          {v.sub}
        </p>
      </div>

      {/* Warnings sit ABOVE the reassuring detail. Someone who reads only the first
          screenful must still get the bad news. */}
      {result.warnings?.length ? (
        <ul
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "var(--space-sm)",
            listStyle: "none",
          }}
        >
          {result.warnings.map((w) => (
            <li
              key={w}
              style={{
                borderLeft: "3px solid var(--color-warn)",
                paddingLeft: "var(--space-sm)",
                fontSize: "var(--text-base)",
                color: "var(--color-ink)",
              }}
            >
              {w}
            </li>
          ))}
        </ul>
      ) : null}

      {result.verdict !== "not_found" ? (
        <>
          <dl
            style={{
              display: "grid",
              gridTemplateColumns: "auto 1fr",
              gap: "var(--space-sm) var(--space-lg)",
              fontSize: "var(--text-base)",
            }}
          >
            <Term label="Medicine" value={result.drug?.name} />
            <Term label="Made by" value={result.manufacturer?.name} />
            <Term label="Use before" value={result.expirationDate} mono />
            {result.dispensedBy ? (
              <Term
                label="Sold by"
                value={`${result.dispensedBy.name}, ${result.dispensedBy.at.slice(0, 10)}`}
              />
            ) : null}
          </dl>

          {/* The custody chain — organizations, never people. */}
          {result.chain?.length ? (
            <section>
              <h2 style={{ fontSize: "var(--text-lg)" }}>Where it has been</h2>
              <ol
                style={{
                  marginTop: "var(--space-sm)",
                  listStyle: "none",
                  display: "flex",
                  flexDirection: "column",
                  gap: "var(--space-sm)",
                }}
              >
                {result.chain.map((step, i) => (
                  <li
                    key={`${step.at}-${i}`}
                    style={{
                      display: "flex",
                      gap: "var(--space-sm)",
                      alignItems: "baseline",
                      borderTop: "1px solid var(--color-rule)",
                      paddingTop: "var(--space-sm)",
                    }}
                  >
                    <span className="label" style={{ minWidth: "5.5rem" }}>
                      {step.event}
                    </span>
                    <span style={{ color: "var(--color-ink)" }}>{step.org}</span>
                    <span
                      className="mono"
                      style={{
                        marginLeft: "auto",
                        fontSize: "var(--text-xs)",
                        color: "var(--color-ink-3)",
                      }}
                    >
                      {step.at.slice(0, 10)}
                    </span>
                  </li>
                ))}
              </ol>
            </section>
          ) : null}
        </>
      ) : null}

      <Again />
    </>
  );
}

function Term({
  label,
  value,
  mono,
}: {
  label: string;
  value?: string;
  mono?: boolean;
}) {
  if (!value) return null;
  return (
    <>
      <dt className="label" style={{ whiteSpace: "nowrap" }}>
        {label}
      </dt>
      <dd className={mono ? "mono" : undefined} style={{ color: "var(--color-ink)" }}>
        {value}
      </dd>
    </>
  );
}

function Verdict({
  verdict,
  overrideTitle,
}: {
  verdict: Verdict;
  overrideTitle?: string;
}) {
  const v = VERDICT[verdict];
  return (
    <div
      style={{
        background: v.bg,
        borderRadius: "var(--radius-lg)",
        padding: "var(--space-xl) var(--space-lg)",
      }}
    >
      <p
        style={{
          fontFamily: "var(--font-display)",
          fontSize: "var(--text-verdict)",
          fontWeight: 700,
          lineHeight: 1.05,
          letterSpacing: "-0.03em",
          color: v.fg,
        }}
      >
        {overrideTitle ?? v.title}
      </p>
    </div>
  );
}

function Again() {
  return (
    <Link
      href="/verify"
      className="btn"
      style={{ alignSelf: "flex-start", padding: "var(--space-sm) var(--space-md)" }}
    >
      Check another
    </Link>
  );
}
