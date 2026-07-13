/**
 * Test fixture: a pharmacy that has REGISTERED but not been approved.
 *
 * This is not seeding the product — signup is the product's way in (app/signup). This
 * exists only so the e2e can exercise the wall and the approval queue without waiting on
 * Supabase's confirmation-email rate limit, which throttles the real signup path to a
 * couple of accounts an hour unless the project has custom SMTP.
 *
 * Run:  pnpm fixture:pending
 * Prints the email it created, so the browser test can sign in as them.
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

async function main() {
  const stamp = Date.now();
  const name = `Pending Pharmacy ${stamp}`;
  const email = `pending.${stamp}@example.test`;

  const [org] = await sql<{ org_id: string }[]>`
    insert into organizations (type, name, registration_no, status)
    values ('pharmacy'::org_type, ${name}, ${`REG-${stamp}`}, 'pending'::org_status)
    returning org_id`;

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: PASSWORD,
    email_confirm: true,
  });
  if (error || !data.user) throw error ?? new Error("no user");

  await sql`insert into users (user_id, email) values (${data.user.id}, ${email})`;
  await sql`
    insert into memberships (user_id, org_id, role)
    values (${data.user.id}, ${org!.org_id}, 'admin'::member_role)`;

  console.log(JSON.stringify({ email, password: PASSWORD, org: name }));
  await sql.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
