import { validateCreateBatch, type CreateBatchInput } from "@/lib/domain/batches";
import { DomainError, notFound } from "@/lib/domain/errors";
import type { Actor, License } from "@/lib/domain/types";
import { sql } from "@/lib/db/client";

import { audit, today } from "./audit";

/**
 * Batch creation — MFR-1/2/3/5.
 *
 * The whole thing is one transaction: the batch row, the N serialized units, and the
 * audit entry commit together or not at all. A half-generated batch would mean units
 * existing in the world with no record of why, which is precisely the condition this
 * system is built to make impossible.
 */

export async function createBatch(actor: Actor, input: CreateBatchInput) {
  // Find the licence the manufacturer intends to produce under. We look it up rather
  // than letting the caller name one — a caller who can choose their own licence id
  // can choose somebody else's.
  const [row] = await sql<
    {
      license_id: string;
      drug_type_id: string;
      manufacturer_org_id: string;
      status: "valid" | "revoked";
      expires_at: string;
    }[]
  >`
    select license_id, drug_type_id, manufacturer_org_id, status, expires_at
    from licenses
    where manufacturer_org_id = ${actor.orgId}
      and drug_type_id = ${input.drugTypeId}
      and status = 'valid'
    order by expires_at desc
    limit 1`;

  if (!row) {
    // MFR-5. No usable licence at all — say so plainly; this is the refusal the
    // regulator most cares about.
    throw new DomainError(
      "LICENSE_INVALID",
      "your organization holds no valid licence for this drug type",
      { drugTypeId: input.drugTypeId },
    );
  }

  const license: License = {
    licenseId: row.license_id,
    drugTypeId: row.drug_type_id,
    manufacturerOrgId: row.manufacturer_org_id,
    status: row.status,
    expiresAt: String(row.expires_at).slice(0, 10),
  };

  validateCreateBatch(actor, input, license, today());

  return sql.begin(async (tx) => {
    const [batch] = await tx<{ batch_id: string }[]>`
      insert into batches
        (drug_type_id, license_id, manufacturer_org_id, lot_no, quantity,
         expiration_date, created_by)
      values
        (${input.drugTypeId}, ${license.licenseId}, ${actor.orgId}, ${input.lotNo},
         ${input.quantity}, ${input.expirationDate}, ${actor.userId})
      returning batch_id`;

    // Units are generated in-database: one statement, N rows, gen_random_uuid() per
    // unit. generate_batch_units() re-checks the licence at the instant of insert, so
    // a licence revoked between our check and this call still stops production.
    const [generated] = await tx<{ generate_batch_units: number }[]>`
      select generate_batch_units(${batch!.batch_id}::uuid, ${actor.orgId}::uuid)`;

    const count = Number(generated!.generate_batch_units);
    if (count !== input.quantity) {
      // Abort the transaction: better no batch than a batch of the wrong size.
      throw new DomainError("CONFLICT", "unit generation produced an unexpected count", {
        expected: input.quantity,
        actual: count,
      });
    }

    await audit(tx, actor, "batch.created", "batch", batch!.batch_id, {
      drugTypeId: input.drugTypeId,
      licenseId: license.licenseId,
      lotNo: input.lotNo,
      quantity: input.quantity,
      expirationDate: input.expirationDate,
    });

    return { batchId: batch!.batch_id, unitsCreated: count };
  });
}

export async function listBatches(actor: Actor) {
  const rows = await sql<
    {
      batch_id: string;
      lot_no: string;
      quantity: number;
      expiration_date: string;
      status: string;
      created_at: string;
      drug_name: string;
      manufacturer_name: string;
    }[]
  >`
    select b.batch_id, b.lot_no, b.quantity, b.expiration_date, b.status, b.created_at,
           d.name as drug_name, o.name as manufacturer_name
    from batches b
    join drug_types d on d.drug_type_id = b.drug_type_id
    join organizations o on o.org_id = b.manufacturer_org_id
    where ${actor.orgType === "government"} or b.manufacturer_org_id = ${actor.orgId}
    order by b.created_at desc
    limit 200`;

  return rows.map((r) => ({
    batchId: r.batch_id,
    lotNo: r.lot_no,
    quantity: r.quantity,
    expirationDate: String(r.expiration_date).slice(0, 10),
    status: r.status,
    drugName: r.drug_name,
    manufacturerName: r.manufacturer_name,
    createdAt: r.created_at,
  }));
}

/** The units of one batch — for QR export. Paged, because a batch is up to 5,000 rows. */
export async function listBatchUnits(
  actor: Actor,
  batchId: string,
  limit = 500,
  offset = 0,
) {
  const [batch] = await sql<{ manufacturer_org_id: string }[]>`
    select manufacturer_org_id from batches where batch_id = ${batchId}`;
  if (!batch) throw notFound("batch not found");

  if (
    actor.orgType !== "government" &&
    batch.manufacturer_org_id !== actor.orgId
  ) {
    throw notFound("batch not found"); // not 403 — do not confirm it exists
  }

  const rows = await sql<{ unit_id: string; status: string }[]>`
    select unit_id, status from medicine_units
    where batch_id = ${batchId}
    order by unit_id
    limit ${limit} offset ${offset}`;

  return rows.map((r) => ({ unitId: r.unit_id, status: r.status }));
}
