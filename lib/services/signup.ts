import { sql } from "@/lib/db/client";
import { invalid } from "@/lib/domain/errors";
import { validateApproveOrg, validateSignup } from "@/lib/domain/signup";
import type { Actor, OrgType } from "@/lib/domain/types";
import { serviceClient, userClient } from "@/lib/supabase/server";

import { audit } from "./audit";

/**
 * Signing up: an account and the organisation it belongs to, created in one breath.
 *
 * The organisation lands in 'pending'. Its admin can sign in, and can see exactly one
 * thing — that they are waiting. lib/auth/actor.ts refuses to assemble an Actor for a
 * non-active org, so there is no console, no API call and no write available to them
 * until a regulator says so.
 *
 * THE BOOTSTRAP. Somebody has to be the first regulator, and there is nobody to approve
 * them. So the first government organisation to register — and only while no other
 * exists — is active immediately. Every government signup after that is a claim like any
 * other, approved by the regulator already in place. This is the one place the system
 * trusts on first-come, and it is deliberately a one-time door that closes behind itself.
 */
export async function signUpOrganization(input: {
  email: string;
  password: string;
  orgType: string;
  orgName: string;
  registrationNo?: string;
}) {
  validateSignup(input);

  const email = input.email.trim().toLowerCase();
  const orgName = input.orgName.trim();

  const [nameTaken] = await sql<{ org_id: string }[]>`
    select org_id from organizations where name = ${orgName}`;
  if (nameTaken) {
    // The org name is uniquely indexed (migration 000800). Say so plainly rather than
    // letting the insert fail with a constraint violation nobody can read.
    throw invalid(
      "an organization is already registered under that name — if it is yours, ask its administrator to invite you",
    );
  }

  const [emailTaken] = await sql<{ user_id: string }[]>`
    select user_id from users where lower(email) = ${email}`;
  if (emailTaken) {
    throw invalid("that email address already has an account — sign in instead");
  }

  const [firstGov] = await sql<{ org_id: string }[]>`
    select org_id from organizations where type = 'government' limit 1`;
  const bootstrapping = input.orgType === "government" && !firstGov;
  const status = bootstrapping ? "active" : "pending";

  // signUp(), not admin.createUser(): the user is choosing their own password and it must
  // never travel through our code as something we could store. Whether they get a session
  // straight away or an emailed confirmation first is Supabase's setting, and we handle
  // both — the caller checks whether a session came back.
  const supabase = await userClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password: input.password,
  });

  if (error || !data.user) {
    throw invalid(error?.message ?? "that account could not be created");
  }

  const userId = data.user.id;

  try {
    await sql.begin(async (tx) => {
      const [org] = await tx<{ org_id: string }[]>`
        insert into organizations (type, name, registration_no, status)
        values (
          ${input.orgType}::org_type,
          ${orgName},
          ${input.registrationNo?.trim() || null},
          ${status}::org_status
        )
        returning org_id`;

      await tx`
        insert into users (user_id, email) values (${userId}, ${email})
        on conflict (user_id) do nothing`;

      // Whoever registers the organisation administers it. They are the person who will
      // invite everyone else, and there is no one else yet to grant them the role.
      await tx`
        insert into memberships (user_id, org_id, role)
        values (${userId}, ${org!.org_id}, 'admin'::member_role)`;

      await audit(
        // The actor IS the person who just signed up — the audit trail should say so,
        // not attribute the registration to a system that did not choose to do it.
        tx,
        {
          userId,
          orgId: org!.org_id,
          orgType: input.orgType as OrgType,
          role: "admin",
          mfaVerified: false,
        },
        "organization.registered",
        "organization",
        org!.org_id,
        { name: orgName, type: input.orgType, status, selfRegistered: true },
      );
    });
  } catch (e) {
    // The auth user exists but has no organisation — precisely the orphan state this
    // system refuses to hold. Undo it, so the address is free to try again.
    await serviceClient().auth.admin.deleteUser(userId).catch(() => {});
    throw e;
  }

  return {
    userId,
    status,
    // No session means Supabase is configured to confirm addresses by email first.
    needsEmailConfirmation: !data.session,
  };
}

/** The regulator lets a claimant in. */
export async function approveOrganization(actor: Actor, orgId: string) {
  validateApproveOrg(actor);

  return sql.begin(async (tx) => {
    const [org] = await tx<{ org_id: string; name: string }[]>`
      update organizations set status = 'active'
      where org_id = ${orgId} and status = 'pending'
      returning org_id, name`;

    if (!org) throw invalid("that organization is not awaiting approval");

    await audit(tx, actor, "organization.approved", "organization", orgId, {
      name: org.name,
    });

    return { orgId, name: org.name };
  });
}

/** And turns one away. The organisation stays on the record; it simply cannot act. */
export async function rejectOrganization(actor: Actor, orgId: string, note?: string) {
  validateApproveOrg(actor);

  return sql.begin(async (tx) => {
    const [org] = await tx<{ org_id: string; name: string }[]>`
      update organizations set status = 'suspended'
      where org_id = ${orgId} and status = 'pending'
      returning org_id, name`;

    if (!org) throw invalid("that organization is not awaiting approval");

    await audit(tx, actor, "organization.rejected", "organization", orgId, {
      name: org.name,
      note: note ?? null,
    });

    return { orgId, name: org.name };
  });
}
