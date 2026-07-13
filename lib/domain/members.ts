import { assertRole, assertStepUpIfPrivileged } from "./access";
import { invalid } from "./errors";
import type { Actor, MemberRole } from "./types";

/**
 * Who may put a person into an organisation, and with what role.
 *
 * This is the mechanism /access has been promising since the marketing site shipped:
 * "administrators invite their staff from inside the console". Until now that sentence
 * was a lie — there was no invite path anywhere, and the only accounts in existence were
 * the ones the seed script wrote with a service-role key.
 *
 * The rule is narrow on purpose. An admin may only ever add people to THEIR OWN
 * organisation — the actor's orgId is the only org id in play, and no caller can name a
 * different one. That is what stops a compromised pharmacy admin inviting themselves
 * into the regulator.
 */

const ROLES: MemberRole[] = ["admin", "operator", "viewer"];

/** RFC-5322 in full is a trap. This rejects what is obviously not an address. */
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateInvite(
  actor: Actor,
  input: { email: string; role: string },
): asserts input is { email: string; role: MemberRole } {
  // Only an admin invites, and inviting is a privileged act — a second factor is
  // required, exactly as it is for revoking a licence. An admin who can mint colleagues
  // is an admin who can mint themselves a quieter accomplice.
  assertRole(actor, "admin");
  assertStepUpIfPrivileged(actor);

  if (!EMAIL.test(input.email)) {
    throw invalid("that does not look like an email address");
  }
  if (!ROLES.includes(input.role as MemberRole)) {
    throw invalid(`role must be one of ${ROLES.join(", ")}`);
  }
}

export function validateRemoveMember(actor: Actor, targetUserId: string): void {
  assertRole(actor, "admin");
  assertStepUpIfPrivileged(actor);

  // An admin removing themselves could leave an organisation with no admin at all —
  // no one able to invite, and a seat in the national chain that nobody can administer.
  // The recovery from that is a database write, so we simply do not allow it.
  if (actor.userId === targetUserId) {
    throw invalid(
      "you cannot remove yourself — ask another administrator in your organization",
    );
  }
}
