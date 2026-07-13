import { sql } from "@/lib/db/client";
import { invalid } from "@/lib/domain/errors";
import { validateInvite, validateRemoveMember } from "@/lib/domain/members";
import type { Actor, MemberRole } from "@/lib/domain/types";
import { serviceClient } from "@/lib/supabase/server";

import { audit } from "./audit";

/**
 * Staff of one organisation.
 *
 * The invite is the only place in the app that creates a person, and it deliberately
 * creates them ALREADY ATTACHED to an organisation. There is no window in which an
 * account exists with no seat — which is the exact state /access says the system refuses
 * to hold, and the reason there is no self-serve sign-up form.
 */

export interface Member {
  userId: string;
  email: string;
  role: MemberRole;
  joinedAt: string;
  /** No password set yet — they have been sent a link and have not followed it. */
  pending: boolean;
  isYou: boolean;
}

export async function listMembers(actor: Actor): Promise<Member[]> {
  const rows = await sql<
    { user_id: string; email: string; role: string; created_at: string }[]
  >`
    select u.user_id, u.email, m.role, m.created_at
    from memberships m
    join users u on u.user_id = m.user_id
    where m.org_id = ${actor.orgId}
    order by m.created_at`;

  // "Has this person ever signed in?" lives in auth.users, which we do not join to
  // directly — it is Supabase's schema, and RLS on it is not ours to reason about.
  const svc = serviceClient();
  const { data } = await svc.auth.admin.listUsers({ perPage: 1000 });
  const confirmed = new Map(
    (data?.users ?? []).map((u) => [u.id, Boolean(u.last_sign_in_at)]),
  );

  return rows.map((r) => ({
    userId: r.user_id,
    email: r.email,
    role: r.role as MemberRole,
    joinedAt: r.created_at,
    pending: !confirmed.get(r.user_id),
    isYou: r.user_id === actor.userId,
  }));
}

/**
 * Invite someone into the actor's organisation.
 *
 * Supabase sends the mail and owns the token; we never generate, store, or email a
 * credential ourselves. The link lands on /auth/callback, which exchanges it for a
 * session and drops the invitee on /reset-password to choose a password.
 *
 * A person already in ANOTHER organisation is refused rather than quietly moved. Every
 * licence, batch and dispense is attributed to an org through this table, and silently
 * re-seating someone would re-point the meaning of records already written.
 */
export async function inviteMember(
  actor: Actor,
  input: { email: string; role: string },
) {
  validateInvite(actor, input);

  const email = input.email.trim().toLowerCase();
  const svc = serviceClient();

  const [existing] = await sql<{ user_id: string; org_id: string }[]>`
    select u.user_id, m.org_id
    from users u
    left join memberships m on m.user_id = u.user_id
    where lower(u.email) = ${email}
    limit 1`;

  if (existing?.org_id && existing.org_id !== actor.orgId) {
    throw invalid("that person already belongs to another organization");
  }
  if (existing?.org_id === actor.orgId) {
    throw invalid("that person is already in your organization");
  }

  let userId = existing?.user_id;

  if (!userId) {
    const site = process.env.NEXT_PUBLIC_SITE_URL ?? "";
    const { data, error } = await svc.auth.admin.inviteUserByEmail(email, {
      redirectTo: `${site}/auth/callback?next=/reset-password`,
    });
    if (error || !data?.user) {
      throw invalid(error?.message ?? "the invitation could not be sent");
    }
    userId = data.user.id;
  }

  return sql.begin(async (tx) => {
    await tx`
      insert into users (user_id, email) values (${userId!}, ${email})
      on conflict (user_id) do nothing`;

    await tx`
      insert into memberships (user_id, org_id, role)
      values (${userId!}, ${actor.orgId}, ${input.role}::member_role)`;

    await audit(tx, actor, "member.invited", "user", userId!, {
      email,
      role: input.role,
    });

    return { userId: userId!, email, role: input.role };
  });
}

/**
 * Take someone's seat away.
 *
 * The membership goes; the auth account and the `users` row stay. Deleting the person
 * would orphan every audit entry that names them — and an audit trail whose actor
 * column has gone blank is not an audit trail. (Migration 000400 dropped the audit FKs
 * for exactly this reason.)
 */
export async function removeMember(actor: Actor, targetUserId: string) {
  validateRemoveMember(actor, targetUserId);

  return sql.begin(async (tx) => {
    const removed = await tx<{ user_id: string }[]>`
      delete from memberships
      where user_id = ${targetUserId} and org_id = ${actor.orgId}
      returning user_id`;

    if (removed.length === 0) {
      throw invalid("that person is not in your organization");
    }

    await audit(tx, actor, "member.removed", "user", targetUserId, {});

    return { userId: targetUserId };
  });
}
