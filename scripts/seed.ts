/**
 * Development seed. Creates one organisation of each type with a signed-in-able user,
 * so the app can be exercised by hand.
 *
 * Idempotent: re-running updates rather than duplicating.
 *
 * Run:  pnpm db:seed
 */

import { createClient } from "@supabase/supabase-js";
import postgres from "postgres";

const sql = postgres(process.env.DATABASE_URL!, { max: 1, prepare: false });
const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false, autoRefreshToken: false } },
);

const PASSWORD = "DevPassw0rd!";

const PEOPLE = [
  { email: "gov@example.test", org: "Medicines Regulatory Authority", type: "government", role: "admin" },
  { email: "mfr@example.test", org: "PharmaCorp", type: "manufacturer", role: "operator" },
  { email: "pharmacy@example.test", org: "City Pharmacy", type: "pharmacy", role: "operator" },
] as const;

async function main() {
  for (const p of PEOPLE) {
    const [org] = await sql<{ org_id: string }[]>`
      insert into organizations (type, name)
      values (${p.type}::org_type, ${p.org})
      on conflict do nothing
      returning org_id`;

    const orgId =
      org?.org_id ??
      (
        await sql<{ org_id: string }[]>`
          select org_id from organizations where name = ${p.org}`
      )[0]!.org_id;

    // createUser fails if the address is taken; fall back to looking it up.
    const { data: created } = await admin.auth.admin.createUser({
      email: p.email,
      password: PASSWORD,
      email_confirm: true,
    });

    let userId = created?.user?.id;
    if (!userId) {
      const { data: list } = await admin.auth.admin.listUsers();
      userId = list.users.find((u) => u.email === p.email)?.id;
    }
    if (!userId) throw new Error(`could not create or find ${p.email}`);

    await sql`
      insert into users (user_id, email) values (${userId}, ${p.email})
      on conflict (user_id) do nothing`;
    await sql`
      insert into memberships (user_id, org_id, role)
      values (${userId}, ${orgId}, ${p.role}::member_role)
      on conflict (user_id, org_id) do update set role = excluded.role`;

    console.log(`  ${p.email.padEnd(24)} ${p.type.padEnd(13)} ${p.org}`);
  }

  console.log(`\n  password for all three: ${PASSWORD}\n`);
  await sql.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
