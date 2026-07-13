import { assertGovernment, assertStepUpIfPrivileged } from "@/lib/domain/access";
import { notFound } from "@/lib/domain/errors";
import {
  validateIssueLicense,
  validateProlongLicense,
  validateRevokeLicense,
} from "@/lib/domain/licenses";
import type { Actor, IsoDate, License } from "@/lib/domain/types";
import { sql } from "@/lib/db/client";

import { audit, today } from "./audit";

/**
 * Licence use cases. GOV-3, GOV-4, GOV-5.
 *
 * The shape of every one of these is the same and deliberately so:
 *   1. load the current state
 *   2. hand it to lib/domain, which decides whether the action is permitted
 *   3. write + audit, in one transaction
 *
 * No rule is expressed here. If a check looks like business logic and it lives in this
 * file, it is in the wrong file — it belongs in lib/domain where it can be tested
 * without a database.
 */

type LicenseRow = {
  license_id: string;
  drug_type_id: string;
  manufacturer_org_id: string;
  status: "valid" | "revoked";
  expires_at: string;
};

const toDomain = (r: LicenseRow): License => ({
  licenseId: r.license_id,
  drugTypeId: r.drug_type_id,
  manufacturerOrgId: r.manufacturer_org_id,
  status: r.status,
  // postgres date -> YYYY-MM-DD
  expiresAt: String(r.expires_at).slice(0, 10),
});

async function loadLicense(licenseId: string): Promise<License> {
  const [row] = await sql<LicenseRow[]>`
    select license_id, drug_type_id, manufacturer_org_id, status, expires_at
    from licenses where license_id = ${licenseId}`;
  if (!row) throw notFound("licence not found", { licenseId });
  return toDomain(row);
}

export async function issueLicense(
  actor: Actor,
  input: { drugTypeId: string; manufacturerOrgId: string; expiresAt: IsoDate },
) {
  validateIssueLicense(actor, input, today());

  return sql.begin(async (tx) => {
    // Referenced rows must exist and be the right kind of thing. Postgres' FKs would
    // catch a missing id, but not "you issued a manufacturing licence to a pharmacy".
    const [org] = await tx<{ type: string; status: string }[]>`
      select type, status from organizations where org_id = ${input.manufacturerOrgId}`;
    if (!org) throw notFound("manufacturer not found");
    if (org.type !== "manufacturer") {
      throw notFound("that organization is not a manufacturer");
    }

    const [drug] = await tx`
      select 1 from drug_types where drug_type_id = ${input.drugTypeId}`;
    if (!drug) throw notFound("drug type not found");

    const [license] = await tx<{ license_id: string }[]>`
      insert into licenses (drug_type_id, manufacturer_org_id, expires_at, issued_by)
      values (${input.drugTypeId}, ${input.manufacturerOrgId}, ${input.expiresAt},
              ${actor.userId})
      returning license_id`;

    await audit(tx, actor, "license.issued", "license", license!.license_id, {
      drugTypeId: input.drugTypeId,
      manufacturerOrgId: input.manufacturerOrgId,
      expiresAt: input.expiresAt,
    });

    return { licenseId: license!.license_id };
  });
}

export async function revokeLicense(actor: Actor, licenseId: string) {
  const license = await loadLicense(licenseId);
  validateRevokeLicense(actor, license);

  return sql.begin(async (tx) => {
    await tx`
      update licenses
      set status = 'revoked', revoked_at = now(), revoked_by = ${actor.userId}
      where license_id = ${licenseId}`;

    // GOV-4: revocation must prevent NEW units. Units already produced under the
    // licence stay valid — they were lawfully made. Recall is a separate action.
    await audit(tx, actor, "license.revoked", "license", licenseId, {
      drugTypeId: license.drugTypeId,
      manufacturerOrgId: license.manufacturerOrgId,
    });

    return { licenseId, status: "revoked" as const };
  });
}

export async function prolongLicense(
  actor: Actor,
  licenseId: string,
  newExpiresAt: IsoDate,
) {
  const license = await loadLicense(licenseId);
  validateProlongLicense(actor, license, newExpiresAt);

  return sql.begin(async (tx) => {
    await tx`
      update licenses set expires_at = ${newExpiresAt} where license_id = ${licenseId}`;

    await audit(tx, actor, "license.prolonged", "license", licenseId, {
      from: license.expiresAt,
      to: newExpiresAt,
    });

    return { licenseId, expiresAt: newExpiresAt };
  });
}

/**
 * Government sees every licence; a manufacturer sees only its own. PRD B.1/B.2.
 *
 * No step-up here. MFA guards ACTIONS with blast radius — revoking a licence, onboarding
 * an organization — not the act of looking at a table you are already authorised to see.
 * Requiring it to read would lock a regulator out of their own console.
 */
export async function listLicenses(actor: Actor) {
  const rows = await sql<
    (LicenseRow & { drug_name: string; manufacturer_name: string })[]
  >`
    select l.license_id, l.drug_type_id, l.manufacturer_org_id, l.status, l.expires_at,
           d.name as drug_name, o.name as manufacturer_name
    from licenses l
    join drug_types d on d.drug_type_id = l.drug_type_id
    join organizations o on o.org_id = l.manufacturer_org_id
    where ${actor.orgType === "government"}
       or l.manufacturer_org_id = ${actor.orgId}
    order by l.issued_at desc`;

  const now = today();
  return rows.map((r) => ({
    ...toDomain(r),
    drugName: r.drug_name,
    manufacturerName: r.manufacturer_name,
    // The UI must never re-derive this. "Valid" and "usable today" are different
    // questions, and the difference is exactly where counterfeits get in.
    usable: r.status === "valid" && String(r.expires_at).slice(0, 10) >= now,
  }));
}

export async function registerOrganization(
  actor: Actor,
  input: { type: "manufacturer" | "pharmacy"; name: string; registrationNo?: string },
) {
  assertGovernment(actor); // GOV-6
  assertStepUpIfPrivileged(actor);

  return sql.begin(async (tx) => {
    const [org] = await tx<{ org_id: string }[]>`
      insert into organizations (type, name, registration_no, created_by)
      values (${input.type}::org_type, ${input.name},
              ${input.registrationNo ?? null}, ${actor.userId})
      returning org_id`;

    await audit(tx, actor, "organization.registered", "organization", org!.org_id, {
      type: input.type,
      name: input.name,
    });

    return { orgId: org!.org_id };
  });
}
