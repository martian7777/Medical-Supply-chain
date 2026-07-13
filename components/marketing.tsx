import Link from "next/link";

/**
 * The public-facing shell: nav + footer for the landing page and the access page.
 * Distinct from the operator shell in app/(app)/layout.tsx — an operator's nav is
 * scoped to their role; this one addresses a visitor who has no role yet.
 */

export function MarketingNav() {
  return (
    <header className="mkt-nav">
      <div className="mkt-nav__inner">
        <Link href="/" className="mkt-nav__brand">
          MSWP
        </Link>

        <nav aria-label="Site" className="mkt-nav__center">
          <Link href="/#how" className="mkt-nav__link">
            How it works
          </Link>
          <Link href="/#roles" className="mkt-nav__link">
            Who it&apos;s for
          </Link>
          <Link href="/signup" className="mkt-nav__link">
            Get access
          </Link>
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
        <span style={{ fontFamily: "var(--font-display)", fontWeight: 600, color: "var(--color-ink)" }}>
          MSWP
        </span>
        <span>Medical Supply Web Project</span>
        <span aria-hidden="true">·</span>
        <span>licences, serialized units, custody, public verification</span>
        <span aria-hidden="true">·</span>
        <Link href="/verify">Check a medicine</Link>
        <span aria-hidden="true">·</span>
        <Link href="/login">Sign in</Link>
        <span aria-hidden="true">·</span>
        <Link href="/signup">Get access</Link>
        <span aria-hidden="true">·</span>
        <span>© 2026</span>
      </div>
    </footer>
  );
}
