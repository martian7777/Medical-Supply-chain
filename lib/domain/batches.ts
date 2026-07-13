import { assertOrgType, assertOwns, assertRole } from "./access";
import { invalid } from "./errors";
import { assertLicenseUsable } from "./licenses";
import { MAX_BATCH_QUANTITY } from "./types";
import type { Actor, IsoDate, License } from "./types";

/**
 * Batch creation. Replaces docs/04 §2.5 CreateMedicineUnit — see the plan's spec
 * deviations register. One call, one production run, N serialized units.
 *
 * MFR-1 / MFR-5: units may be created only under a licence the manufacturer holds,
 * for that drug type, which is valid, unrevoked and unexpired. This is the rule the
 * entire system exists to enforce; it is checked here, and again in Postgres inside
 * generate_batch_units() at the instant of insert.
 */

export interface CreateBatchInput {
  drugTypeId: string;
  lotNo: string;
  quantity: number;
  expirationDate: IsoDate;
}

export function validateCreateBatch(
  actor: Actor,
  input: CreateBatchInput,
  license: License,
  today: IsoDate,
): void {
  assertOrgType(actor, "manufacturer");
  assertRole(actor, "admin", "operator"); // viewers cannot produce

  // The licence must belong to the caller and cover the drug being made.
  assertOwns(actor, license.manufacturerOrgId);
  if (license.drugTypeId !== input.drugTypeId) {
    throw invalid("licence does not cover this drug type", {
      licenseDrugTypeId: license.drugTypeId,
      requestedDrugTypeId: input.drugTypeId,
    });
  }

  assertLicenseUsable(license, today);

  if (!Number.isInteger(input.quantity) || input.quantity < 1) {
    throw invalid("quantity must be a positive whole number", {
      quantity: input.quantity,
    });
  }
  if (input.quantity > MAX_BATCH_QUANTITY) {
    throw invalid(
      `quantity exceeds the maximum of ${MAX_BATCH_QUANTITY} units per batch`,
      { quantity: input.quantity, max: MAX_BATCH_QUANTITY },
    );
  }

  // Producing medicine that is already expired is nonsense, and it would poison the
  // verification portal with units that can never legitimately be dispensed.
  if (input.expirationDate <= today) {
    throw invalid("expiration date must be in the future", {
      expirationDate: input.expirationDate,
    });
  }

  if (input.lotNo.trim().length === 0) {
    throw invalid("lot number is required");
  }
}
