import { assertOrgType, assertOwns, assertRole } from "./access";
import { DomainError } from "./errors";
import type { Actor, Batch, IsoDate, MedicineUnit } from "./types";

/**
 * Dispense — the terminal event in a unit's life. Replaces docs/04 §2.6's
 * "transfer to citizen".
 *
 * A citizen is NOT an owner and NOT an entity in this system. Dispensing records
 * WHERE (the pharmacy) and WHEN. It does not record WHO, because the public
 * verification endpoint is unauthenticated, and a system that both (a) stores the
 * buyer's identity against a medicine and (b) serves that record to anyone holding
 * the code is a system that publishes "this named person takes this drug".
 *
 * The anti-counterfeit guarantee is untouched by this: a cloned code is still caught,
 * because the genuine unit is already marked dispensed.
 */

export function validateDispense(
  actor: Actor,
  unit: MedicineUnit,
  batch: Batch,
  today: IsoDate,
): void {
  assertOrgType(actor, "pharmacy");
  assertRole(actor, "admin", "operator");
  assertOwns(actor, unit.currentOwnerOrgId); // SYS-2

  if (unit.status === "dispensed") {
    // The single most important refusal in the product. If this unit was already
    // sold, the box in the customer's hand is either a duplicate code or a returned
    // item — and either way it must not silently succeed.
    throw new DomainError(
      "UNIT_NOT_TRANSFERABLE",
      "unit has already been dispensed",
      { unitId: unit.unitId, dispensedAt: unit.dispensedAt },
    );
  }
  if (unit.status !== "active") {
    throw new DomainError(
      "UNIT_NOT_TRANSFERABLE",
      `unit is ${unit.status} and cannot be dispensed`,
      { unitId: unit.unitId, status: unit.status },
    );
  }
  if (batch.expirationDate < today) {
    throw new DomainError("UNIT_NOT_TRANSFERABLE", "medicine has expired", {
      unitId: unit.unitId,
      expirationDate: batch.expirationDate,
    });
  }
}
