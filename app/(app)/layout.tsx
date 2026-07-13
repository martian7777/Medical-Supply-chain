import Link from "next/link";
import { redirect } from "next/navigation";

import { currentActor } from "@/lib/auth/actor";
import { DomainError } from "@/lib/domain/errors";
import { userClient } from "@/lib/supabase/server";

/**
 * The operator shell.
 *
 * A flush, hairline-bottomed bar — not a floating marketing pill. Nav shows only the
 * destinations this role actually has: a pharmacy clerk never sees "Licences", because
 * they cannot issue one, and a nav that lists actions you'll be refused is a nav that
 * teaches you to distrust it.
 */

/**
 * One console per role, not a tree of pages that each hold a single table. A regulator
 * moves between drug types, licences and organizations constantly; making those three
 * separate routes would cost a page load per glance.
 */
const NAV: Record<string, Array<{ href: string; label: string }>> = {
  government: [
    { href: "/government", label: "Oversight" },
    { href: "/verify", label: "Verify a code" },
  ],
  manufacturer: [
    { href: "/manufacturer", label: "Production" },
    { href: "/verify", label: "Verify a code" },
  ],
  pharmacy: [
    { href: "/pharmacy", label: "Dispensing" },
    { href: "/verify", label: "Verify a code" },
  ],
};

/**
 * Two destinations every role shares.
 *
 * Security was previously reachable only from a warning banner on the government
 * console — so a manufacturer or pharmacy admin, whose actions ALSO require a second
 * factor, had no way to enrol one. A page that exists but cannot be navigated to is a
 * page that does not exist.
 */
const COMMON = [
  { href: "/organization", label: "People" },
  { href: "/security", label: "Security" },
];

async function signOut() {
  "use server";
  const supabase = await userClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let actor;
  try {
    actor = await currentActor();
  } catch (e) {
    if (e instanceof DomainError) {
      // A pending org's admin is signed in and legitimate — they are simply not cleared
      // yet. Bouncing them to /login would ask them to authenticate again to fix a
      // problem authentication cannot fix, which reads as a broken product.
      redirect(e.code === "ORG_PENDING" ? "/pending" : "/login");
    }
    throw e;
  }

  const links = [...(NAV[actor.orgType] ?? []), ...COMMON];

  return (
    <div style={{ minHeight: "100dvh", display: "flex", flexDirection: "column" }}>
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: "var(--z-nav)",
          borderBottom: "1px solid var(--color-rule)",
          background: "color-mix(in oklch, var(--color-paper) 88%, transparent)",
          backdropFilter: "blur(8px)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "var(--space-lg)",
            padding: "var(--space-sm) var(--space-lg)",
            maxWidth: "82rem",
            margin: "0 auto",
            flexWrap: "wrap",
          }}
        >
          <Link
            href={`/${actor.orgType}`}
            style={{
              fontFamily: "var(--font-display)",
              fontWeight: 600,
              color: "var(--color-ink)",
              letterSpacing: "-0.02em",
            }}
          >
            MSWP
          </Link>

          <nav
            aria-label="Sections"
            style={{ display: "flex", gap: "var(--space-md)", flexWrap: "wrap" }}
          >
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                style={{
                  fontSize: "var(--text-sm)",
                  color: "var(--color-ink-2)",
                  whiteSpace: "nowrap",
                }}
              >
                {l.label}
              </Link>
            ))}
          </nav>

          <div
            style={{
              marginLeft: "auto",
              display: "flex",
              alignItems: "center",
              gap: "var(--space-sm)",
            }}
          >
            {/* The operator must always know which organization they are acting FOR.
                Every write is attributed to it, and a clerk with two employers who
                dispenses from the wrong one has falsified a record. */}
            <span className="label" style={{ textTransform: "none" }}>
              {actor.orgType} · {actor.role}
            </span>
            <form action={signOut}>
              <button type="submit" className="btn">
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>

      <main
        style={{
          flex: 1,
          width: "100%",
          maxWidth: "82rem",
          margin: "0 auto",
          padding: "var(--space-xl) var(--space-lg) var(--space-3xl)",
          display: "flex",
          flexDirection: "column",
          gap: "var(--space-xl)",
        }}
      >
        {children}
      </main>
    </div>
  );
}
