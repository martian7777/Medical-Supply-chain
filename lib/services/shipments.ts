import { notFound } from "@/lib/domain/errors";
import {
  resolutionStatus,
  validateDispatch,
  validateResolveShipment,
} from "@/lib/domain/shipments";
import type { Actor, MedicineUnit, Organization, Shipment } from "@/lib/domain/types";
import { sql } from "@/lib/db/client";

import { audit } from "./audit";

/**
 * Two-phase custody: dispatch -> accept / reject / partially accept.
 *
 * CONCURRENCY. The dangerous move here is dispatching the same unit twice — two
 * shipments each believing they hold it, and whichever pharmacy accepts second gets a
 * unit that is already someone else's. A check-then-write would race. Instead, the
 * status flip to 'in_transit' is itself the lock: the UPDATE only matches units that
 * are still 'active' and still ours, and we insist it matched every unit we asked for.
 * A concurrent dispatch loses, deterministically.
 */

export async function dispatchShipment(
  actor: Actor,
  input: { toOrgId: string; unitIds: string[]; note?: string },
) {
  const [receiverRow] = await sql<
    { org_id: string; type: string; status: string; name: string }[]
  >`
    select org_id, type, status, name from organizations where org_id = ${input.toOrgId}`;
  if (!receiverRow) throw notFound("receiving organization not found");

  const receiver: Organization = {
    orgId: receiverRow.org_id,
    type: receiverRow.type as Organization["type"],
    name: receiverRow.name,
    status: receiverRow.status as Organization["status"],
  };

  const unitRows = await sql<
    { unit_id: string; batch_id: string; current_owner_org_id: string; status: string }[]
  >`
    select unit_id, batch_id, current_owner_org_id, status
    from medicine_units
    where unit_id in ${sql(input.unitIds)}`;

  const units: MedicineUnit[] = unitRows.map((r) => ({
    unitId: r.unit_id,
    batchId: r.batch_id,
    currentOwnerOrgId: r.current_owner_org_id,
    status: r.status as MedicineUnit["status"],
  }));

  validateDispatch(actor, input, units, receiver);

  return sql.begin(async (tx) => {
    const [shipment] = await tx<{ shipment_id: string }[]>`
      insert into shipments (from_org_id, to_org_id, dispatched_by, note)
      values (${actor.orgId}, ${input.toOrgId}, ${actor.userId}, ${input.note ?? null})
      returning shipment_id`;

    // The lock. Only units still active AND still ours flip to in_transit.
    const moved = await tx<{ unit_id: string }[]>`
      update medicine_units
      set status = 'in_transit'
      where unit_id in ${tx(input.unitIds)}
        and current_owner_org_id = ${actor.orgId}
        and status = 'active'
      returning unit_id`;

    if (moved.length !== input.unitIds.length) {
      // Someone dispatched one of these between our read and our write. Roll back the
      // whole shipment rather than send a partial consignment nobody asked for.
      throw notFound(
        "some units are no longer available to ship (they may already be in transit)",
        { requested: input.unitIds.length, available: moved.length },
      );
    }

    await tx`
      insert into shipment_lines (shipment_id, unit_id)
      select ${shipment!.shipment_id}, unnest(${tx.array(input.unitIds)}::uuid[])`;

    await audit(tx, actor, "shipment.dispatched", "shipment", shipment!.shipment_id, {
      toOrgId: input.toOrgId,
      unitCount: input.unitIds.length,
    });

    return { shipmentId: shipment!.shipment_id, unitCount: input.unitIds.length };
  });
}

/**
 * Accept, reject, or partially accept. Ownership moves ONLY here — this is the single
 * moment custody changes hands, and only the addressee can trigger it.
 */
export async function resolveShipment(
  actor: Actor,
  shipmentId: string,
  input: { acceptedUnitIds?: string[]; note?: string },
) {
  const [row] = await sql<
    { shipment_id: string; from_org_id: string; to_org_id: string; status: string }[]
  >`
    select shipment_id, from_org_id, to_org_id, status
    from shipments where shipment_id = ${shipmentId}`;
  if (!row) throw notFound("shipment not found");

  const shipment: Shipment = {
    shipmentId: row.shipment_id,
    fromOrgId: row.from_org_id,
    toOrgId: row.to_org_id,
    status: row.status as Shipment["status"],
  };

  validateResolveShipment(actor, shipment);

  const lines = await sql<{ unit_id: string }[]>`
    select unit_id from shipment_lines where shipment_id = ${shipmentId}`;
  const allUnitIds = lines.map((l) => l.unit_id);

  // Default: accept everything. A partial acceptance names only what actually arrived.
  const accepted = input.acceptedUnitIds
    ? allUnitIds.filter((id) => input.acceptedUnitIds!.includes(id))
    : allUnitIds;
  const rejected = allUnitIds.filter((id) => !accepted.includes(id));

  const status = resolutionStatus(accepted.length, allUnitIds.length);

  return sql.begin(async (tx) => {
    if (accepted.length > 0) {
      // Custody transfers.
      await tx`
        update medicine_units
        set current_owner_org_id = ${shipment.toOrgId}, status = 'active'
        where unit_id in ${tx(accepted)} and status = 'in_transit'`;
      await tx`
        update shipment_lines set accepted = true
        where shipment_id = ${shipmentId} and unit_id in ${tx(accepted)}`;
    }

    if (rejected.length > 0) {
      // Refused units go home to the sender, who still owns them and always did.
      await tx`
        update medicine_units
        set status = 'active'
        where unit_id in ${tx(rejected)} and status = 'in_transit'`;
      await tx`
        update shipment_lines set accepted = false
        where shipment_id = ${shipmentId} and unit_id in ${tx(rejected)}`;
    }

    await tx`
      update shipments
      set status = ${status}::shipment_status,
          resolved_at = now(),
          resolved_by = ${actor.userId},
          note = coalesce(${input.note ?? null}, note)
      where shipment_id = ${shipmentId}`;

    await audit(tx, actor, `shipment.${status}` as const, "shipment", shipmentId, {
      fromOrgId: shipment.fromOrgId,
      accepted: accepted.length,
      rejected: rejected.length,
    });

    return {
      shipmentId,
      status,
      accepted: accepted.length,
      rejected: rejected.length,
    };
  });
}

/** The pharmacy's inbox, and the manufacturer's outbox — same query, different side. */
export async function listShipments(actor: Actor, box: "in" | "out") {
  const rows = await sql<
    {
      shipment_id: string;
      status: string;
      dispatched_at: string;
      counterparty: string;
      unit_count: number;
    }[]
  >`
    select s.shipment_id, s.status, s.dispatched_at,
           case when ${box === "in"} then f.name else t.name end as counterparty,
           count(sl.unit_id)::int as unit_count
    from shipments s
    join organizations f on f.org_id = s.from_org_id
    join organizations t on t.org_id = s.to_org_id
    left join shipment_lines sl on sl.shipment_id = s.shipment_id
    where case when ${box === "in"}
               then s.to_org_id = ${actor.orgId}
               else s.from_org_id = ${actor.orgId} end
    group by s.shipment_id, s.status, s.dispatched_at, f.name, t.name
    order by s.dispatched_at desc
    limit 100`;

  return rows.map((r) => ({
    shipmentId: r.shipment_id,
    status: r.status,
    dispatchedAt: r.dispatched_at,
    counterparty: r.counterparty,
    unitCount: r.unit_count,
  }));
}
