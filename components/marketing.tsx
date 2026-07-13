import Link from "next/link";

/**
 * The public shell: nav + footer for the landing page and every document page.
 * Distinct from the operator shell in app/(app)/layout.tsx — an operator's nav is
 * scoped to their role; this one addresses a visitor who has no role yet, so its
 * two actions are the two things a visitor can actually do: check a box, or sign in.
 */

const NAV = [
  { href: "/#how", label: "How it works" },
  { href: "/access", label: "Get access" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
];

const FOOT = [
  { href: "/verify", label: "Check a medicine" },
  { href: "/access", label: "Get access" },
  { href: "/login", label: "Sign in" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
];

export function MarketingNav() {
  return (
    <header className="mkt-nav">
      <div className="mkt-nav__inner">
        <Link href="/" className="mkt-nav__brand">
          MSWP
        </Link>

        <nav aria-label="Site" className="mkt-nav__center">
          {NAV.map((l) => (
            <Link key={l.href} href={l.href} className="mkt-nav__link">
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="mkt-nav__right">
          <Link href="/login" className="btn">
            Sign in
          </Link>
          <Link href="/verify" className="btn btn--primary">
            Check a medicine
          </Link>
        </div>
      </div>
    </header>
  );
}

export function MarketingFooter() {
  return (
    <footer className="mkt-foot">
      <div className="mkt-foot__inner">
        <div className="mkt-foot__mast">
          <Link href="/" className="mkt-foot__word">
            MSWP
          </Link>
          <span className="mkt-foot__tag">
            Licences, serialized units, custody, public verification.
          </span>
        </div>

        <nav aria-label="Footer" className="mkt-foot__links">
          {FOOT.map((l) => (
            <Link key={l.href} href={l.href}>
              {l.label}
            </Link>
          ))}
        </nav>

        <p className="mkt-foot__legal">
          © 2026 Medical Supply Web Project. Checking a medicine never requires an
          account.
        </p>
      </div>
    </footer>
  );
}
