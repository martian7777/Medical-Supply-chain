import { assertOrgType, assertOwns, assertRole } from "./access";
import { DomainError, invalid } from "./errors";
import type { Actor, MedicineUnit, Organization, Shipment } from "./types";

/**
 * Two-phase custody transfer. Replaces docs/04 §2.6's instantaneous, one-sided
 * TransferOwnership — see the plan's spec deviations register.
 *
 *   dispatch  : units leave the sender's inventory and become `in_transit`.
 *               Ownership does NOT move.
 *   accept    : ownership moves to the receiver. This is the only moment custody
 *               changes hands.
 *   reject    : units return to the sender, and the discrepancy is on the record.
 *
 * The point is that a receiver's inventory can never contain something they did not
 * agree to take. Under the one-sided model, a manufacturer could book 10,000 units
 * onto a pharmacy's ledger and the pharmacy had no way to say "those never arrived".
 */

export interface DispatchInput {
  toOrgId: string;
  unitIds: string[];
}

/** MFR-4 / SYS-2. Only the current owner may send, and only what it actually holds. */
export function validateDispatch(
  actor: Actor,
  input: DispatchInput,
  units: MedicineUnit[],
  receiver: Organization,
): void {
  assertOrgType(actor, "manufacturer", "pharmacy");
  assertRole(actor, "admin", "operator");

  if (input.unitIds.length === 0) {
    throw invalid("a shipment must contain at least one unit");
  }
  if (input.toOrgId === actor.orgId) {
    throw invalid("cannot ship to your own organization");
  }

  // A manufacturer ships to a pharmacy. A pharmacy does not ship to a manufacturer.
  if (receiver.type !== "pharmacy") {
    throw invalid("units may only be shipped to a pharmacy", {
      receiverType: receiver.type,
    });
  }
  if (receiver.status !== "active") {
    throw invalid("receiving organization is suspended", {
      toOrgId: receiver.orgId,
    });
  }

  // Every requested unit must have been found...
  if (units.length !== input.unitIds.length) {
    const found = new Set(units.map((u) => u.unitId));
    throw new DomainError("NOT_FOUND", "one or more units do not exist", {
      missing: input.unitIds.filter((id) => !found.has(id)),
    });
  }

  // ...owned by the sender, and free to move.
  for (const unit of units) {
    assertOwns(actor, unit.currentOwnerOrgId);
    if (unit.status !== "active") {
      throw new DomainError(
        "UNIT_NOT_TRANSFERABLE",
        `unit is ${unit.status} and cannot be shipped`,
        { unitId: unit.unitId, status: unit.status },
      );
    }
  }
}

/** Only the addressee resolves a shipment, and only once. */
export function validateResolveShipment(
  actor: Actor,
  shipment: Shipment,
): void {
  assertRole(actor, "admin", "operator");

  if (shipment.toOrgId !== actor.orgId) {
    throw new DomainError(
      "FORBIDDEN",
      "only the receiving organization may accept or reject a shipment",
    );
  }
  if (shipment.status !== "dispatched") {
    throw new DomainError("CONFLICT", "shipment has already been resolved", {
      shipmentId: shipment.shipmentId,
      status: shipment.status,
    });
  }
}

/**
 * Partial acceptance: the receiver takes some units and refuses the rest (a case
 * arrived short, or three boxes were crushed). Accepted units transfer; the rest go
 * back to the sender. Both halves are recorded.
 */
export function resolutionStatus(
  acceptedCount: number,
  totalCount: number,
): Shipment["status"] {
  if (acceptedCount === 0) return "rejected";
  if (acceptedCount === totalCount) return "accepted";
  return "partially_accepted";
}
