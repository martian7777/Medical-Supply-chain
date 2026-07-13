import { assertGovernment } from "@/lib/domain/access";
import { ANOMALY_THRESHOLDS } from "@/lib/domain/verification";
import type { Actor } from "@/lib/domain/types";
import { sql } from "@/lib/db/client";

/** GOV-7: the regulator reads everything. These are read-only, government-only. */

export async function listOrganizations(actor: Actor) {
  const rows = await sql<
    {
      org_id: string;
      type: string;
      name: string;
      registration_no: string | null;
      status: string;
    }[]
  >`
    select org_id, type, name, registration_no, status
    from organizations
    order by type, name`;

  return rows.map((r) => ({
    orgId: r.org_id,
    type: r.type,
    name: r.name,
    registrationNo: r.registration_no,
    status: r.status,
  }));
}

/** Everything a manufacturer or pharmacy might need to pick from a dropdown. */
export async function listOrganizationsByType(type: "manufacturer" | "pharmacy") {
  const rows = await sql<{ org_id: string; name: string }[]>`
    select org_id, name from organizations
    where type = ${type}::org_type and status = 'active'
    order by name`;
  return rows.map((r) => ({ orgId: r.org_id, name: r.name }));
}

export async function oversightCounts(actor: Actor) {
  assertGovernment(actor);

  const [row] = await sql<
    {
      drug_types: number;
      licenses_valid: number;
      units_total: number;
      units_dispensed: number;
      orgs: number;
    }[]
  >`
    select
      (select count(*) from drug_types)::int                                as drug_types,
      (select count(*) from licenses
        where status = 'valid' and expires_at >= current_date)::int         as licenses_valid,
      (select count(*) from medicine_units)::int                            as units_total,
      (select count(*) from medicine_units where status = 'dispensed')::int as units_dispensed,
      (select count(*) from organizations where type <> 'government')::int  as orgs`;

  return {
    drugTypes: row?.drug_types ?? 0,
    validLicences: row?.licenses_valid ?? 0,
    unitsTotal: row?.units_total ?? 0,
    unitsDispensed: row?.units_dispensed ?? 0,
    organizations: row?.orgs ?? 0,
  };
}

/**
 * Counterfeit signal — the reason scan telemetry exists.
 *
 * A genuine pack is scanned a handful of times, in one place, before it is sold. A code
 * photocopied onto a thousand fake boxes gets scanned hundreds of times, across many
 * regions, long after the real unit was dispensed. This query surfaces exactly that.
 */
export async function flaggedUnits(actor: Actor, limit = 20) {
  assertGovernment(actor);

  const rows = await sql<
    {
      unit_id: string;
      scans: number;
      regions: number;
      after_dispense: number;
      exists_in_system: boolean;
      drug_name: string | null;
    }[]
  >`
    select
      s.unit_id,
      count(*)::int                                                      as scans,
      count(distinct s.region)::int                                      as regions,
      count(*) filter (
        where u.dispensed_at is not null and s.scanned_at > u.dispensed_at
      )::int                                                             as after_dispense,
      (u.unit_id is not null)                                            as exists_in_system,
      d.name                                                             as drug_name
    from verification_scans s
    left join medicine_units u on u.unit_id = s.unit_id
    left join batches b        on b.batch_id = u.batch_id
    left join drug_types d     on d.drug_type_id = b.drug_type_id
    group by s.unit_id, u.unit_id, u.dispensed_at, d.name
    having
         count(distinct s.region) > ${ANOMALY_THRESHOLDS.distinctRegions}
      or count(*) > ${ANOMALY_THRESHOLDS.totalScans}
      or count(*) filter (
           where u.dispensed_at is not null and s.scanned_at > u.dispensed_at
         ) > ${ANOMALY_THRESHOLDS.scansAfterDispense}
      -- A code nobody ever issued, being scanned in the wild, is a fake box in
      -- someone's hand right now. It is the loudest signal in the system.
      or u.unit_id is null
    order by count(*) desc
    limit ${limit}`;

  return rows.map((r) => ({
    unitId: r.unit_id,
    scans: r.scans,
    regions: r.regions,
    afterDispense: r.after_dispense,
    known: r.exists_in_system,
    drugName: r.drug_name,
  }));
}

export async function recentAudit(actor: Actor, limit = 25) {
  assertGovernment(actor);

  const rows = await sql<
    {
      action: string;
      entity_type: string;
      entity_id: string;
      created_at: string;
      org_name: string | null;
      user_email: string | null;
    }[]
  >`
    select a.action, a.entity_type, a.entity_id, a.created_at,
           o.name as org_name, u.email as user_email
    from audit_log a
    left join organizations o on o.org_id = a.actor_org_id
    left join users u        on u.user_id = a.actor_user_id
    order by a.created_at desc
    limit ${limit}`;

  return rows.map((r) => ({
    action: r.action,
    entityType: r.entity_type,
    entityId: r.entity_id,
    at: r.created_at,
    org: r.org_name,
    user: r.user_email,
  }));
}
