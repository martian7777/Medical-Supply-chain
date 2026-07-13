import { currentActor } from "@/lib/auth/actor";

/**
 * SPIKE (a): the thin authenticated thread.
 *
 * Proves the chain that everything in Phases 2-3 is built on:
 *   middleware refreshes the session cookie
 *     -> a Server Component reads it and revalidates the user
 *       -> memberships resolve that user to an organisation and a role
 *         -> the domain layer has a trustworthy Actor
 *
 * Replaced by the real role-specific dashboards in Phase 3.
 */
export default async function DashboardPage() {
  const actor = await currentActor();

  const rows: Array<[string, string]> = [
    ["Organization", actor.orgId],
    ["Org type", actor.orgType],
    ["Role", actor.role],
    ["MFA (aal2)", actor.mfaVerified ? "verified" : "not verified"],
  ];

  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <h1 className="text-2xl font-semibold tracking-tight">Signed in</h1>
      <p className="mt-2 text-sm text-[var(--color-muted)]">
        The session resolved to a real organisation and role. This is the Actor the
        domain layer will trust.
      </p>

      <dl className="mt-8 divide-y divide-[var(--color-line)] border-y border-[var(--color-line)]">
        {rows.map(([label, value]) => (
          <div key={label} className="flex justify-between gap-6 py-3">
            <dt className="text-sm text-[var(--color-muted)]">{label}</dt>
            <dd className="font-mono text-sm">{value}</dd>
          </div>
        ))}
      </dl>
    </main>
  );
}
