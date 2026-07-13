/**
 * Removes every artefact the spike creates, including from runs that were killed
 * before their own cleanup could execute. Touches nothing that is not a spike fixture.
 *
 * Run:  pnpm spike:purge
 */

import { createClient } from "@supabase/supabase-js";
import postgres from "postgres";

const sql = postgres(process.env.DATABASE_URL!, { max: 1, prepare: false });
const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false, autoRefreshToken: false } },
);

async function main() {
  const spikeOrgs = await sql<{ org_id: string }[]>`
    select org_id from organizations where name like '%(spike)'`;
  const orgIds = spikeOrgs.map((o) => o.org_id);

  if (orgIds.length === 0) {
    console.log("  nothing to purge");
  } else {
    const units = await sql`
      delete from medicine_units
      where batch_id in (select batch_id from batches where manufacturer_org_id in ${sql(orgIds)})`;
    const lines = await sql`
      delete from shipment_lines
      where shipment_id in (select shipment_id from shipments where from_org_id in ${sql(orgIds)})`;
    await sql`delete from shipments where from_org_id in ${sql(orgIds)}`;
    const batches = await sql`delete from batches where manufacturer_org_id in ${sql(orgIds)}`;
    await sql`delete from licenses where manufacturer_org_id in ${sql(orgIds)}`;
    await sql`delete from drug_types where code like 'SPIKE-%'`;
    await sql`delete from memberships where org_id in ${sql(orgIds)}`;

    console.log(
      `  purged ${units.count} units, ${batches.count} batches, ${lines.count} shipment lines`,
    );
  }

  // audit_log is append-only by design — we cannot delete spike rows, and that is the
  // point. They stay, harmlessly, as evidence the immutability check is real.
  const spikeUsers = await sql<{ user_id: string }[]>`
    select user_id from users where email like '%@spike.test'`;

  for (const u of spikeUsers) {
    await admin.auth.admin.deleteUser(u.user_id).catch(() => {});
  }
  await sql`delete from users where email like '%@spike.test'`;
  await sql`delete from organizations where name like '%(spike)'`;

  console.log(`  purged ${spikeUsers.length} spike users and their organizations`);
  await sql.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
