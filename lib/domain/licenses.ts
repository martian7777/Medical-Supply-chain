import { assertGovernment, assertStepUpIfPrivileged } from "./access";
import { DomainError, invalid } from "./errors";
import type { Actor, IsoDate, License } from "./types";

/**
 * Licence rules. docs/04-business-logic-specification.md §2.2–2.4,
 * docs/05-data-model.md §3 ("Expiration logic").
 */

/**
 * The single question the rest of the system asks about a licence: may a unit be
 * produced under it right now? Revocation beats expiry; both are disqualifying.
 *
 * Everything downstream (batch creation, the DB backstop in generate_batch_units)
 * agrees with this function or is a bug.
 */
export function isLicenseUsable(license: License, today: IsoDate): boolean {
  if (license.status === "revoked") return false;
  return license.expiresAt >= today; // YYYY-MM-DD sorts lexicographically = chronologically
}

export function assertLicenseUsable(license: License, today: IsoDate): void {
  if (license.status === "revoked") {
    throw new DomainError("LICENSE_INVALID", "licence has been revoked", {
      licenseId: license.licenseId,
    });
  }
  if (license.expiresAt < today) {
    throw new DomainError("LICENSE_INVALID", "licence has expired", {
      licenseId: license.licenseId,
      expiresAt: license.expiresAt,
    });
  }
}

export interface IssueLicenseInput {
  drugTypeId: string;
  manufacturerOrgId: string;
  expiresAt: IsoDate;
}

/** GOV-3. Government only; expiry must be in the future. */
export function validateIssueLicense(
  actor: Actor,
  input: IssueLicenseInput,
  today: IsoDate,
): void {
  assertGovernment(actor);
  assertStepUpIfPrivileged(actor);
  if (input.expiresAt <= today) {
    throw invalid("licence expiry must be a future date", {
      expiresAt: input.expiresAt,
    });
  }
}

/** GOV-4. Revoking an already-revoked licence is a conflict, not a no-op. */
export function validateRevokeLicense(actor: Actor, license: License): void {
  assertGovernment(actor);
  assertStepUpIfPrivileged(actor);
  if (license.status === "revoked") {
    throw new DomainError("CONFLICT", "licence is already revoked", {
      licenseId: license.licenseId,
    });
  }
}

/**
 * GOV-5. Prolongation extends a *living* licence. A revoked licence cannot be
 * quietly resurrected by pushing its expiry out — that would be a way to undo a
 * revocation without an audit entry saying so. Re-issue instead.
 */
export function validateProlongLicense(
  actor: Actor,
  license: License,
  newExpiresAt: IsoDate,
): void {
  assertGovernment(actor);
  assertStepUpIfPrivileged(actor);
  if (license.status === "revoked") {
    throw new DomainError(
      "LICENSE_INVALID",
      "a revoked licence cannot be prolonged; issue a new one",
      { licenseId: license.licenseId },
    );
  }
  if (newExpiresAt <= license.expiresAt) {
    throw invalid("new expiry must be later than the current expiry", {
      current: license.expiresAt,
      requested: newExpiresAt,
    });
  }
}
