import { createHash } from "node:crypto";

import { DomainError } from "@/lib/domain/errors";
import {
  buildVerification,
  notFound as notFoundResult,
  type PublicVerification,
  type ScanStats,
} from "@/lib/domain/verification";
import type { Batch, DrugType, MedicineUnit, Organization } from "@/lib/domain/types";
import { sql } from "@/lib/db/client";

/**
 * Public verification — VER-1/2/3. The only unauthenticated write path in the system
 * (it appends a scan), so it is also the only one that needs abuse control.
 */

const RATE_LIMIT = { windowSeconds: 60, maxRequests: 30 };

/**
 * Callers are identified by a SALTED hash of their IP, never the IP itself.
 *
 * A raw IP is personal data under GDPR, and this table is retained for counterfeit
 * analysis. Hashing with a server-side secret means we can still answer "is this the
 * same caller as a moment ago?" and "how many regions has this code been scanned
 * from?" without ever storing who anybody is. Rotating SCAN_HASH_SALT severs the
 * link permanently.
 */
function hashClient(value: string): string {
  const salt = process.env.SCAN_HASH_SALT ?? "";
  return createHash("sha256").update(`${salt}:${value}`).digest("hex").slice(0, 32);
}

export interface ScanContext {
  ip: string;
  userAgent: string;
  region: string | null;
}

async function enforceRateLimit(ipHash: string): Promise<void> {
  const [row] = await sql<{ hits: number }[]>`
    select count(*)::int as hits
    from verification_scans
    where ip_hash = ${ipHash}
      and scanned_at > now() - make_interval(secs => ${RATE_LIMIT.windowSeconds})`;

  if ((row?.hits ?? 0) >= RATE_LIMIT.maxRequests) {
    // Scraping the whole UUID space is infeasible (v4 is unguessable), so the threat
    // is not enumeration — it is a counterfeiter probing which of their cloned codes
    // are still unflagged, and simple hammering.
    throw new DomainError("CONFLICT", "too many verification requests; slow down", {
      retryAfterSeconds: RATE_LIMIT.windowSeconds,
    });
  }
}

export async function verifyUnit(
  unitId: string,
  ctx: ScanContext,
): Promise<PublicVerification> {
  const ipHash = hashClient(ctx.ip);
  await enforceRateLimit(ipHash);

  // Record the scan BEFORE deciding the verdict — including for codes that do not
  // exist. Somebody scanning a code we have never issued is holding a fake box, and
  // that is one of the most valuable signals the regulator can have.
  await sql`
    insert into verification_scans (unit_id, region, ip_hash, ua_hash)
    values (${unitId}, ${ctx.region}, ${ipHash}, ${hashClient(ctx.userAgent)})`;

  const [row] = await sql<
    {
      unit_id: string;
      batch_id: string;
      current_owner_org_id: string;
      status: string;
      dispensed_at: string | null;
      dispensed_by_name: string | null;
      lot_no: string;
      quantity: number;
      expiration_date: string;
      batch_status: string;
      drug_type_id: string;
      license_id: string;
      manufacturer_org_id: string;
      drug_code: string;
      drug_name: string;
      manufacturer_name: string;
      produced_at: string;
    }[]
  >`
    select u.unit_id, u.batch_id, u.current_owner_org_id, u.status, u.dispensed_at,
           dp.name as dispensed_by_name,
           b.lot_no, b.quantity, b.expiration_date, b.status as batch_status,
           b.drug_type_id, b.license_id, b.manufacturer_org_id, b.created_at as produced_at,
           d.code as drug_code, d.name as drug_name,
           m.name as manufacturer_name
    from medicine_units u
    join batches b       on b.batch_id = u.batch_id
    join drug_types d    on d.drug_type_id = b.drug_type_id
    join organizations m on m.org_id = b.manufacturer_org_id
    left join organizations dp on dp.org_id = u.dispensed_by_org_id
    where u.unit_id = ${unitId}`;

  // VER-2. An unknown code is "not found" — never an error, never a hint that the
  // code is *nearly* right.
  if (!row) return notFoundResult();

  const stats = await scanStats(unitId, row.dispensed_at);

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

  const drugType: DrugType = {
    drugTypeId: row.drug_type_id,
    code: row.drug_code,
    name: row.drug_name,
  };

  const manufacturer: Organization = {
    orgId: row.manufacturer_org_id,
    type: "manufacturer",
    name: row.manufacturer_name,
    status: "active",
  };

  return buildVerification({
    unit,
    batch,
    drugType,
    manufacturer,
    chain: await custodyChain(unitId, row),
    dispensedBy: row.dispensed_by_name
      ? {
          orgId: "",
          type: "pharmacy",
          name: row.dispensed_by_name,
          status: "active",
        }
      : null,
    stats,
  });
}

/**
 * The custody chain, by ORGANISATION. Produced -> received -> dispensed.
 *
 * Only ACCEPTED shipment lines appear: a consignment that was dispatched and refused
 * never changed hands, and showing it as a transfer would be a lie about custody.
 */
async function custodyChain(
  unitId: string,
  row: { manufacturer_name: string; produced_at: string; dispensed_at: string | null; dispensed_by_name: string | null },
) {
  const transfers = await sql<{ org_name: string; at: string }[]>`
    select o.name as org_name, s.resolved_at as at
    from shipment_lines sl
    join shipments s     on s.shipment_id = sl.shipment_id
    join organizations o on o.org_id = s.to_org_id
    where sl.unit_id = ${unitId}
      and sl.accepted is true
    order by s.resolved_at`;

  const chain = [
    {
      org: row.manufacturer_name,
      at: new Date(row.produced_at).toISOString(),
      event: "produced",
    },
    ...transfers.map((t) => ({
      org: t.org_name,
      at: new Date(t.at).toISOString(),
      event: "received",
    })),
  ];

  if (row.dispensed_at && row.dispensed_by_name) {
    chain.push({
      org: row.dispensed_by_name,
      at: new Date(row.dispensed_at).toISOString(),
      event: "dispensed",
    });
  }

  return chain;
}

async function scanStats(
  unitId: string,
  dispensedAt: string | null,
): Promise<ScanStats> {
  const [row] = await sql<
    { total: number; regions: number; after_dispense: number }[]
  >`
    select count(*)::int                              as total,
           count(distinct region)::int                as regions,
           count(*) filter (
             where ${dispensedAt}::timestamptz is not null
               and scanned_at > ${dispensedAt}::timestamptz
           )::int                                     as after_dispense
    from verification_scans
    where unit_id = ${unitId}`;

  return {
    totalScans: row?.total ?? 0,
    distinctRegions: row?.regions ?? 0,
    scansAfterDispense: row?.after_dispense ?? 0,
  };
}
