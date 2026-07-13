import { validateDispense } from "@/lib/domain/dispense";
import { DomainError, notFound } from "@/lib/domain/errors";
import type { Actor, Batch, MedicineUnit } from "@/lib/domain/types";
import { sql } from "@/lib/db/client";

import { audit, today } from "./audit";

/**
 * Dispense — terminal, and the single most important write in the system.
 *
 * CONCURRENCY. Two tills scanning the same box at the same moment must not both
 * succeed; if they did, a duplicated code would sell twice and the counterfeit
 * detection would never fire. The UPDATE therefore carries `status = 'active'` in its
 * WHERE clause and we require it to have matched exactly one row. The second attempt
 * matches nothing and is rejected, whatever the interleaving.
 *
 * NOTHING here records who bought the medicine. There is no parameter for it, no
 * column for it, and no way to add one without changing the schema — which is the
 * point.
 */

export async function dispenseUnit(actor: Actor, unitId: string) {
  const [row] = await sql<
    {
      unit_id: string;
      batch_id: string;
      current_owner_org_id: string;
      status: string;
      dispensed_at: string | null;
      expiration_date: string;
      drug_type_id: string;
      license_id: string;
      manufacturer_org_id: string;
      lot_no: string;
      quantity: number;
      batch_status: string;
    }[]
  >`
    select u.unit_id, u.batch_id, u.current_owner_org_id, u.status, u.dispensed_at,
           b.expiration_date, b.drug_type_id, b.license_id, b.manufacturer_org_id,
           b.lot_no, b.quantity, b.status as batch_status
    from medicine_units u
    join batches b on b.batch_id = u.batch_id
    where u.unit_id = ${unitId}`;

  if (!row) throw notFound("no medicine unit with that code");

  const unit: MedicineUnit = {
    unitId: row.unit_id,
    batchId: row.batch_id,
    currentOwnerOrgId: row.current_owner_org_id,
    status: row.status as MedicineUnit["status"],
    dispensedAt: row.dispensed_at,
  };

  const batch: Batch = {
    batchId: row.batch_id,
    drugTypeId: row.drug_type_id,
    licenseId: row.license_id,
    manufacturerOrgId: row.manufacturer_org_id,
    lotNo: row.lot_no,
    quantity: row.quantity,
    expirationDate: String(row.expiration_date).slice(0, 10),
    status: row.batch_status as Batch["status"],
  };

  validateDispense(actor, unit, batch, today());

  return sql.begin(async (tx) => {
    const updated = await tx<{ unit_id: string }[]>`
      update medicine_units
      set status = 'dispensed',
          dispensed_by_org_id = ${actor.orgId},
          dispensed_at = now()
      where unit_id = ${unitId}
        and current_owner_org_id = ${actor.orgId}
        and status = 'active'
      returning unit_id`;

    if (updated.length !== 1) {
      // Lost the race. Another till got there first — which, if this was a duplicated
      // code, is exactly the counterfeit we are looking for.
      throw new DomainError(
        "UNIT_NOT_TRANSFERABLE",
        "unit was dispensed by someone else a moment ago",
        { unitId },
      );
    }

    await audit(tx, actor, "unit.dispensed", "medicine_unit", unitId, {
      batchId: unit.batchId,
      // No buyer. Deliberately.
    });

    return { unitId, status: "dispensed" as const };
  });
}

/** What a pharmacy currently holds. PH-3. */
export async function listInventory(actor: Actor, limit = 200) {
  const rows = await sql<
    {
      unit_id: string;
      status: string;
      drug_name: string;
      expiration_date: string;
      lot_no: string;
    }[]
  >`
    select u.unit_id, u.status, d.name as drug_name, b.expiration_date, b.lot_no
    from medicine_units u
    join batches b on b.batch_id = u.batch_id
    join drug_types d on d.drug_type_id = b.drug_type_id
    where u.current_owner_org_id = ${actor.orgId}
      and u.status = 'active'
    order by b.expiration_date
    limit ${limit}`;

  const now = today();
  return rows.map((r) => ({
    unitId: r.unit_id,
    status: r.status,
    drugName: r.drug_name,
    lotNo: r.lot_no,
    expirationDate: String(r.expiration_date).slice(0, 10),
    expired: String(r.expiration_date).slice(0, 10) < now,
  }));
}
