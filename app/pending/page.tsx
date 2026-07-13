import Link from "next/link";
import { redirect } from "next/navigation";

import { sql } from "@/lib/db/client";
import { userClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Awaiting approval · MSWP",
};

/**
 * Where a self-registered organisation waits.
 *
 * This page exists so that "you cannot do anything yet" is a sentence somebody wrote,
 * rather than a redirect loop back to a login form the user has already passed. It reads
 * the organisation directly rather than through currentActor(), because currentActor()
 * refuses to build an Actor for a pending org — that refusal is exactly what sent them
 * here.
 */

async function signOut() {
  "use server";
  const supabase = await userClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export default async function PendingPage() {
  const supabase = await userClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const [org] = await sql<{ name: string; type: string; status: string }[]>`
    select o.name, o.type, o.status
    from memberships m
    join organizations o on o.org_id = m.org_id
    where m.user_id = ${user.id}
    limit 1`;

  // Approved (or suspended) while they sat on this page — send them where they belong
  // rather than making them guess that a reload might now work.
  if (!org) redirect("/login");
  if (org.status === "active") redirect("/dashboard");

  const suspended = org.status === "suspended";

  return (
    <main className="auth">
      <div className="auth__col">
        <Link
          href="/"
          style={{
            fontFamily: "var(--font-display)",
            fontWeight: 600,
            letterSpacing: "-0.02em",
            color: "var(--color-ink)",
          }}
        >
          MSWP
        </Link>

        <div className="auth__panel">
          <h1 style={{ fontSize: "var(--text-2xl)" }}>
            {suspended ? "Your registration was not approved" : "Awaiting approval"}
          </h1>

          <p
            style={{
              marginTop: "var(--space-md)",
              fontSize: "var(--text-sm)",
              color: "var(--color-ink-2)",
            }}
          >
            {suspended ? (
              <>
                <strong style={{ color: "var(--color-ink)" }}>{org.name}</strong> cannot
                act in the supply chain. If you believe this is wrong, contact the
                regulator — nothing you do here can change it.
              </>
            ) : (
              <>
                <strong style={{ color: "var(--color-ink)" }}>{org.name}</strong> is
                registered as a {org.type === "government" ? "regulator" : org.type} and
                is waiting for the regulator to approve it. Until then this account cannot
                issue, ship, or dispense anything — which is the point: an organization
                nobody has checked has no business moving medicine.
              </>
            )}
          </p>

          <p
            style={{
              marginTop: "var(--space-sm)",
              fontSize: "var(--text-sm)",
              color: "var(--color-ink-3)",
            }}
          >
            Sign in again once you hear back. Nothing is lost in the meantime.
          </p>

          <form action={signOut} style={{ marginTop: "var(--space-lg)" }}>
            <button type="submit" className="btn">
              Sign out
            </button>
          </form>
        </div>

        <div className="auth__meta">
          <p>
            Checking a medicine needs no account and never did —{" "}
            <Link href="/verify">use the public check</Link>.
          </p>
          <p>
            Questions about approval: <Link href="/contact">contact</Link>.
          </p>
        </div>
      </div>
    </main>
  );
}
