import { createClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { sql } from "@/lib/db/client";
import { DomainError } from "@/lib/domain/errors";
import type { Actor } from "@/lib/domain/types";
import { createBatch, listBatchUnits } from "@/lib/services/batches";
import { dispenseUnit } from "@/lib/services/dispense";
import { createDrugType } from "@/lib/services/drug-types";
import { issueLicense, revokeLicense } from "@/lib/services/licenses";
import { dispatchShipment, resolveShipment } from "@/lib/services/shipments";
import { verifyUnit } from "@/lib/services/verification";

/**
 * PHASE 2 ACCEPTANCE — the full journey against the real database.
 *
 * docs/08 Phase 2 acceptance criteria, executed end to end:
 *   drug type -> licence -> batch -> dispatch -> accept -> dispense -> public verify
 *
 * Plus the refusals, which matter more than the happy path: an unlicensed
 * manufacturer, a revoked licence, a non-owner shipping, a double dispense, and one
 * organization reading another's data.
 *
 * Skips when there is no database (CI runs the pure domain suite instead).
 */

const hasDb = Boolean(process.env.DATABASE_URL);
const stamp = Date.now();

const scan = { ip: "203.0.113.7", userAgent: "vitest", region: "SG" };

let govActor: Actor;
let mfrActor: Actor;
let mfrBActor: Actor;
let pharmActor: Actor;
let drugTypeId: string;

async function mkOrg(type: string, name: string) {
  const [o] = await sql<{ org_id: string }[]>`
    insert into organizations (type, name) values (${type}::org_type, ${name})
    returning org_id`;
  return o!.org_id;
}

/**
 * Built on first use, never at module scope.
 *
 * createClient() throws outright on an empty URL, and a `describe.skipIf` cannot save a
 * file that has already blown up while being imported — the skip is evaluated after the
 * module body runs. So in CI, where there are no credentials, an eager client here fails
 * the whole suite that is supposed to be skipping itself. (lib/db/client.ts is lazy for
 * exactly the same reason.)
 */
let adminClient: ReturnType<typeof createClient> | undefined;
function admin() {
  adminClient ??= createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
  return adminClient;
}

const createdUserIds: string[] = [];
// Two manufacturers exist in this scenario, so org type + role is not a unique name.
let actorSeq = 0;

/**
 * Actors are assembled here rather than by signing in through a browser. That is
 * deliberate: this suite tests the DOMAIN + PERSISTENCE chain. Whether a real *session*
 * produces a correct Actor is a different question, answered by e2e/auth.spec.ts.
 *
 * The auth user is real, though — `users.user_id` is a foreign key into auth.users, so
 * there is no way to fake one, and no reason to want to.
 */
async function mkActor(
  orgId: string,
  orgType: Actor["orgType"],
  role: Actor["role"],
): Promise<Actor> {
  const email = `${orgType}-${role}-${++actorSeq}-${stamp}@flow.test`;

  const { data, error } = await admin().auth.admin.createUser({
    email,
    password: `Flow-${stamp}!`,
    email_confirm: true,
  });
  if (error || !data.user) throw new Error(`createUser ${email}: ${error?.message}`);

  createdUserIds.push(data.user.id);

  await sql`insert into users (user_id, email) values (${data.user.id}, ${email})`;
  await sql`
    insert into memberships (user_id, org_id, role)
    values (${data.user.id}, ${orgId}, ${role}::member_role)`;

  return {
    userId: data.user.id,
    orgId,
    orgType,
    role,
    mfaVerified: true, // government/admin actions require a second factor
  };
}

describe.skipIf(!hasDb)("full supply-chain journey", () => {
  beforeAll(async () => {
    const gov = await mkOrg("government", `Regulator ${stamp} (flow)`);
    const mfr = await mkOrg("manufacturer", `PharmaCorp ${stamp} (flow)`);
    const mfrB = await mkOrg("manufacturer", `RivalPharma ${stamp} (flow)`);
    const pharm = await mkOrg("pharmacy", `City Pharmacy ${stamp} (flow)`);

    govActor = await mkActor(gov, "government", "admin");
    mfrActor = await mkActor(mfr, "manufacturer", "operator");
    mfrBActor = await mkActor(mfrB, "manufacturer", "operator");
    pharmActor = await mkActor(pharm, "pharmacy", "operator");
  });

  afterAll(async () => {
    // Order matters: children before parents. shipment_lines reference medicine_units,
    // so the units cannot go first.
    await sql`delete from shipment_lines where shipment_id in (
                select shipment_id from shipments where from_org_id in (
                  select org_id from organizations where name like ${`%${stamp} (flow)`}))`;
    await sql`delete from shipments where from_org_id in (
                select org_id from organizations where name like ${`%${stamp} (flow)`})`;
    await sql`delete from verification_scans where unit_id in (
                select unit_id from medicine_units where batch_id in (
                  select batch_id from batches where lot_no like ${`%${stamp}`}))`;
    await sql`delete from medicine_units where batch_id in (
                select batch_id from batches where lot_no like ${`%${stamp}`})`;
    await sql`delete from batches where lot_no like ${`%${stamp}`}`;
    await sql`delete from licenses where manufacturer_org_id in (
                select org_id from organizations where name like ${`%${stamp} (flow)`})`;
    await sql`delete from drug_types where code = ${`FLOW-${stamp}`}`;
    await sql`delete from memberships where user_id in (
                select user_id from users where email like ${`%${stamp}@flow.test`})`;
    await sql`delete from users where email like ${`%${stamp}@flow.test`}`;
    await sql`delete from organizations where name like ${`%${stamp} (flow)`}`;

    for (const id of createdUserIds) {
      await admin().auth.admin.deleteUser(id).catch(() => {});
    }
    await sql.end();
  });

  it("GOV-1: government registers a drug type", async () => {
    const result = await createDrugType(govActor, {
      code: `FLOW-${stamp}`,
      name: "Paracetamol 500mg",
    });
    drugTypeId = result.drugTypeId;
    expect(drugTypeId).toBeTruthy();
  });

  it("SYS-3: a manufacturer cannot register a drug type", async () => {
    await expect(
      createDrugType(mfrActor, { code: `HACK-${stamp}`, name: "Nope" }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("MFR-5: an unlicensed manufacturer cannot produce", async () => {
    await expect(
      createBatch(mfrActor, {
        drugTypeId,
        lotNo: `EARLY-${stamp}`,
        quantity: 10,
        expirationDate: "2028-01-01",
      }),
    ).rejects.toMatchObject({ code: "LICENSE_INVALID" });
  });

  it("GOV-3 + MFR-1: licensed, the manufacturer produces a batch", async () => {
    await issueLicense(govActor, {
      drugTypeId,
      manufacturerOrgId: mfrActor.orgId,
      expiresAt: "2030-12-31",
    });

    const batch = await createBatch(mfrActor, {
      drugTypeId,
      lotNo: `LOT-A-${stamp}`,
      quantity: 500,
      expirationDate: "2028-06-30",
    });

    expect(batch.unitsCreated).toBe(500);
  });

  it("GOV-4: a revoked licence stops new production", async () => {
    const lic = await issueLicense(govActor, {
      drugTypeId,
      manufacturerOrgId: mfrBActor.orgId,
      expiresAt: "2030-12-31",
    });
    await revokeLicense(govActor, lic.licenseId);

    await expect(
      createBatch(mfrBActor, {
        drugTypeId,
        lotNo: `LOT-B-${stamp}`,
        quantity: 10,
        expirationDate: "2028-06-30",
      }),
    ).rejects.toMatchObject({ code: "LICENSE_INVALID" });
  });

  it("two-phase custody: dispatch does NOT transfer ownership; acceptance does", async () => {
    const [batch] = await sql<{ batch_id: string }[]>`
      select batch_id from batches where lot_no = ${`LOT-A-${stamp}`}`;
    const units = await listBatchUnits(mfrActor, batch!.batch_id, 10);
    const unitIds = units.map((u) => u.unitId);

    const shipment = await dispatchShipment(mfrActor, {
      toOrgId: pharmActor.orgId,
      unitIds,
    });

    // Still the manufacturer's. This is the whole point of two-phase custody: a sender
    // cannot push stock onto a receiver's books.
    const inTransit = await sql<{ current_owner_org_id: string; status: string }[]>`
      select current_owner_org_id, status from medicine_units
      where unit_id in ${sql(unitIds)}`;
    expect(inTransit.every((u) => u.status === "in_transit")).toBe(true);
    expect(inTransit.every((u) => u.current_owner_org_id === mfrActor.orgId)).toBe(true);

    // Only the addressee may resolve it.
    await expect(
      resolveShipment(mfrActor, shipment.shipmentId, {}),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });

    // Partial acceptance: 7 arrived, 3 did not.
    const result = await resolveShipment(pharmActor, shipment.shipmentId, {
      acceptedUnitIds: unitIds.slice(0, 7),
      note: "3 boxes crushed in transit",
    });

    expect(result.status).toBe("partially_accepted");
    expect(result.accepted).toBe(7);
    expect(result.rejected).toBe(3);

    const after = await sql<{ unit_id: string; current_owner_org_id: string }[]>`
      select unit_id, current_owner_org_id from medicine_units
      where unit_id in ${sql(unitIds)}`;
    const owner = new Map(after.map((r) => [r.unit_id, r.current_owner_org_id]));

    for (const id of unitIds.slice(0, 7)) expect(owner.get(id)).toBe(pharmActor.orgId);
    // The refused three went home. They were never the pharmacy's.
    for (const id of unitIds.slice(7)) expect(owner.get(id)).toBe(mfrActor.orgId);
  });

  it("PH-1: the pharmacy dispenses, and cannot dispense twice", async () => {
    const [held] = await sql<{ unit_id: string }[]>`
      select unit_id from medicine_units
      where current_owner_org_id = ${pharmActor.orgId} and status = 'active' limit 1`;

    const result = await dispenseUnit(pharmActor, held!.unit_id);
    expect(result.status).toBe("dispensed");

    // The cloned-code catch.
    await expect(dispenseUnit(pharmActor, held!.unit_id)).rejects.toMatchObject({
      code: "UNIT_NOT_TRANSFERABLE",
    });
  });

  it("VER-1/3: public verification names the pharmacy, never a person", async () => {
    const [unit] = await sql<{ unit_id: string }[]>`
      select unit_id from medicine_units
      where dispensed_by_org_id = ${pharmActor.orgId} limit 1`;

    const result = await verifyUnit(unit!.unit_id, scan);

    expect(result.verdict).toBe("authentic");
    expect(result.status).toBe("dispensed");
    expect(result.drug?.name).toBe("Paracetamol 500mg");
    expect(result.dispensedBy?.name).toContain("City Pharmacy");

    // Custody chain by organisation: produced -> received -> dispensed.
    expect(result.chain?.map((c) => c.event)).toEqual([
      "produced",
      "received",
      "dispensed",
    ]);

    // The regression guard for the privacy defect this whole design corrected.
    const serialized = JSON.stringify(result);
    for (const forbidden of ["citizen", "nationalId", "buyer", "patient", "currentOwner"]) {
      expect(serialized).not.toContain(forbidden);
    }
  });

  it("VER-2: an unknown code is a calm 'not found', and is still recorded", async () => {
    const ghost = "00000000-0000-4000-8000-000000000000";
    const result = await verifyUnit(ghost, scan);
    expect(result.verdict).toBe("not_found");

    // Somebody holding a code we never issued is the strongest counterfeit signal
    // there is. We keep it.
    const [row] = await sql<{ n: number }[]>`
      select count(*)::int as n from verification_scans where unit_id = ${ghost}`;
    expect(row!.n).toBeGreaterThan(0);

    await sql`delete from verification_scans where unit_id = ${ghost}`;
  });

  it("IDOR: one manufacturer cannot read another's batch units", async () => {
    const [batch] = await sql<{ batch_id: string }[]>`
      select batch_id from batches where lot_no = ${`LOT-A-${stamp}`}`;

    // 404, not 403 — a 403 would confirm the batch exists.
    await expect(
      listBatchUnits(mfrBActor, batch!.batch_id),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("SYS-1: every state change left an audit entry", async () => {
    const rows = await sql<{ action: string }[]>`
      select distinct action from audit_log
      where actor_org_id in (
        select org_id from organizations where name like ${`%${stamp} (flow)`})`;

    const actions = rows.map((r) => r.action);
    expect(actions).toContain("drug_type.created");
    expect(actions).toContain("license.issued");
    expect(actions).toContain("license.revoked");
    expect(actions).toContain("batch.created");
    expect(actions).toContain("shipment.dispatched");
    expect(actions).toContain("shipment.partially_accepted");
    expect(actions).toContain("unit.dispensed");
  });
});
