import { assertGovernment, assertStepUpIfPrivileged } from "./access";
import { invalid } from "./errors";
import type { Actor, OrgType } from "./types";

/**
 * Self-serve registration.
 *
 * The old design had no sign-up at all, on the argument that an account with no
 * organisation is an account with no role we can trust. That argument is right, and it
 * survives here — what changes is HOW an organisation comes to exist. Signing up does not
 * create a trusted seat in the chain; it creates a CLAIM to one, and the regulator
 * decides. Nobody self-attests their way into shipping medicine.
 *
 * So the account and its organisation are created together, always. There is still no
 * moment at which a user exists attached to nothing.
 */

export type SignupOrgType = OrgType;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface SignupInput {
  email: string;
  password: string;
  orgType: OrgType;
  orgName: string;
  registrationNo?: string;
}

export function validateSignup(input: {
  email: string;
  password: string;
  orgType: string;
  orgName: string;
  registrationNo?: string;
}): asserts input is SignupInput {
  if (!EMAIL.test(input.email)) {
    throw invalid("that does not look like an email address");
  }
  // Long, not cryptic. This account can move real medicine, and a 8-character password
  // with a mandatory punctuation mark is worse than a 12-character one without.
  if (input.password.length < 10) {
    throw invalid("use a password of at least 10 characters");
  }
  if (!(["government", "manufacturer", "pharmacy"] as const).includes(
    input.orgType as OrgType,
  )) {
    throw invalid("choose the kind of organization you are");
  }
  if (input.orgName.trim().length < 2) {
    throw invalid("give your organization's registered name");
  }
}

/**
 * Approving a claimant is the regulator's most consequential routine act — it is the
 * moment a stranger becomes someone who may serialize or dispense medicine. Government
 * only, and never on a session that has not proved a second factor.
 */
export function validateApproveOrg(actor: Actor): void {
  assertGovernment(actor);
  assertStepUpIfPrivileged(actor);
}
