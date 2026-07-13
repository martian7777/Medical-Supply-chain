import { DomainError, forbidden } from "./errors";
import type { Actor, MemberRole, OrgType } from "./types";

/**
 * Role and ownership assertions. PRD §B and SYS-3.
 *
 * These are the only place role checks live. A route handler that wants to know
 * "may this actor do X" calls one of these — it never inspects `actor.orgType`
 * itself, because that is how one endpoint ends up with a check the others lack.
 */

export function assertOrgType(actor: Actor, ...allowed: OrgType[]): void {
  if (!allowed.includes(actor.orgType)) {
    throw forbidden(
      `requires org type ${allowed.join(" or ")}, actor is ${actor.orgType}`,
    );
  }
}

export function assertRole(actor: Actor, ...allowed: MemberRole[]): void {
  if (!allowed.includes(actor.role)) {
    throw forbidden(
      `requires role ${allowed.join(" or ")}, actor has ${actor.role}`,
    );
  }
}

export function assertGovernment(actor: Actor): void {
  assertOrgType(actor, "government");
}

/** The actor's org must be the one that holds the thing being acted on. SYS-2. */
export function assertOwns(actor: Actor, ownerOrgId: string): void {
  if (actor.orgId !== ownerOrgId) {
    throw forbidden("actor's organization does not own this resource");
  }
}

/**
 * High-blast-radius actions require a second factor: anything a government user
 * does (licences are revoked here) and anything an org admin does (they onboard
 * and remove other people). Operators doing routine work are not challenged.
 */
export function assertStepUpIfPrivileged(actor: Actor): void {
  const privileged = actor.orgType === "government" || actor.role === "admin";
  if (privileged && !actor.mfaVerified) {
    throw new DomainError(
      "FORBIDDEN",
      "this action requires multi-factor authentication",
      { reason: "mfa_required" },
    );
  }
}
