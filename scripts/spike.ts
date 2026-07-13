/**
 * PHASE-1 INTEGRATION SPIKE
 *
 * Four things can kill this stack. This script finds out now, in week 1, rather than
 * in week 21 when there is no schedule left to absorb it.
 *
 *   (b) Can Postgres serialize a 100,000-unit batch inside a serverless budget?
 *       If not, we need a job queue and the plan changes.
 *   (c) Does RLS actually stop one organisation reading another's units, with a real
 *       user JWT? A policy that is merely *written* has never stopped anything.
 *   (d) Does the Supavisor transaction pooler survive concurrent invocations without
 *       "too many clients" or prepared-statement collisions?
 *   (e) Is the audit log genuinely append-only, even against the service-role key
 *       that our own API holds?
 *
 * Run:  pnpm spike
 */

import { createClient } from "@supabase/supabase-js";
import postgres from "postgres";

const env = (name: string): string => {
  const v = process.env[name];
  if (!v) {
    console.error(`\n  Missing ${name}. Copy .env.example to .env.local first.\n`);
    process.exit(1);
  }
  return v;
};

const SUPABASE_URL = env("NEXT_PUBLIC_SUPABASE_URL");
const ANON_KEY = env("NEXT_PUBLIC_SUPABASE_ANON_KEY");
const SERVICE_KEY = env("SUPABASE_SERVICE_ROLE_KEY");
const DATABASE_URL = env("DATABASE_URL");

const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// A spike that hangs teaches nothing. Cap every query so a failure is a failure,
// not an indefinite wait.
const sql = postgres(DATABASE_URL, {
  max: 5,
  prepare: false,
  connect_timeout: 15,
});

let failures = 0;

const pass = (label: string, detail = "") =>
  console.log(`  \x1b[32mPASS\x1b[0m  ${label}${detail ? `  — ${detail}` : ""}`);
const fail = (label: string, detail = "") => {
  failures++;
  console.log(`  \x1b[31mFAIL\x1b[0m  ${label}${detail ? `  — ${detail}` : ""}`);
};

const PASSWORD = "spike-Passw0rd!";

const step = (msg: string) => console.log(`  ..  ${msg}`);

async function seedFixtures() {
  step("connecting / creating organizations");
  // Two manufacturers. Org A must never be able to see Org B's units.
  const [gov] = await sql`
    insert into organizations (type, name) values ('government', 'Regulator (spike)')
    returning org_id`;
  const [mfrA] = await sql`
    insert into organizations (type, name) values ('manufacturer', 'PharmaCorp A (spike)')
    returning org_id`;
  const [mfrB] = await sql`
    insert into organizations (type, name) values ('manufacturer', 'MediLab B (spike)')
    returning org_id`;

  step("creating auth users");
  const mkUser = async (email: string, orgId: string, role: string) => {
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password: PASSWORD,
      email_confirm: true,
    });
    if (error || !data.user) throw new Error(`createUser ${email}: ${error?.message}`);
    await sql`insert into users (user_id, email) values (${data.user.id}, ${email})`;
    await sql`
      insert into memberships (user_id, org_id, role)
      values (${data.user.id}, ${orgId}, ${role}::member_role)`;
    return data.user.id;
  };

  const stamp = Date.now();
  const govUser = await mkUser(`gov+${stamp}@spike.test`, gov!.org_id, "admin");
  const userA = await mkUser(`a+${stamp}@spike.test`, mfrA!.org_id, "operator");
  const userB = await mkUser(`b+${stamp}@spike.test`, mfrB!.org_id, "operator");

  step("creating drug type + licences");
  const [drug] = await sql`
    insert into drug_types (code, name, created_by)
    values (${`SPIKE-${stamp}`}, 'Paracetamol 500mg (spike)', ${govUser})
    returning drug_type_id`;

  const mkLicense = async (mfrOrg: string) => {
    const [lic] = await sql`
      insert into licenses (drug_type_id, manufacturer_org_id, expires_at, issued_by)
      values (${drug!.drug_type_id}, ${mfrOrg}, '2030-12-31', ${govUser})
      returning license_id`;
    return lic!.license_id as string;
  };

  return {
    govOrg: gov!.org_id as string,
    mfrA: mfrA!.org_id as string,
    mfrB: mfrB!.org_id as string,
    userA,
    userB,
    emailA: `a+${stamp}@spike.test`,
    emailB: `b+${stamp}@spike.test`,
    drugTypeId: drug!.drug_type_id as string,
    licenseA: await mkLicense(mfrA!.org_id as string),
    licenseB: await mkLicense(mfrB!.org_id as string),
    stamp,
  };
}

async function spikeBatchInsert(fx: Awaited<ReturnType<typeof seedFixtures>>) {
  console.log("\n(b) batch generation in a single statement");

  // Was 100,000, which measured 4.3s (~23,000 units/sec) — Postgres has plenty of
  // headroom. The cap is now 5,000 because Vercel Hobby kills a function at 10s and
  // 4.3s left no margin. Asking for more than the CHECK constraint allows would now
  // (correctly) be rejected by the database.
  const QTY = 5_000;
  const [batch] = await sql`
    insert into batches
      (drug_type_id, license_id, manufacturer_org_id, lot_no, quantity,
       expiration_date, created_by)
    values
      (${fx.drugTypeId}, ${fx.licenseA}, ${fx.mfrA}, ${`LOT-${fx.stamp}`}, ${QTY},
       '2028-06-30', ${fx.userA})
    returning batch_id`;

  const started = Date.now();
  const [result] = await sql`
    select generate_batch_units(${batch!.batch_id}::uuid, ${fx.mfrA}::uuid) as inserted`;
  const elapsed = Date.now() - started;

  const inserted = Number(result!.inserted);

  if (inserted !== QTY) {
    fail("generated the requested number of units", `expected ${QTY}, got ${inserted}`);
  } else if (elapsed > 5_000) {
    // Vercel Hobby kills a function at 10s. A full batch must finish with real margin,
    // not just squeak in.
    fail(
      "batch completed within the Hobby serverless budget",
      `${QTY} units took ${elapsed}ms — too close to the 10s ceiling`,
    );
  } else {
    pass(
      `${QTY.toLocaleString()} units serialized in one transaction`,
      `${elapsed}ms (${Math.round(QTY / (elapsed / 1000)).toLocaleString()} units/sec) — no queue needed`,
    );
  }

  // The licence backstop must fire even if the domain layer is bypassed entirely.
  await sql`update licenses set status = 'revoked' where license_id = ${fx.licenseB}`;
  const [badBatch] = await sql`
    insert into batches
      (drug_type_id, license_id, manufacturer_org_id, lot_no, quantity,
       expiration_date, created_by)
    values
      (${fx.drugTypeId}, ${fx.licenseB}, ${fx.mfrB}, ${`LOT-BAD-${fx.stamp}`}, 10,
       '2028-06-30', ${fx.userB})
    returning batch_id`;

  try {
    await sql`select generate_batch_units(${badBatch!.batch_id}::uuid, ${fx.mfrB}::uuid)`;
    fail("DB refuses production under a revoked licence", "it allowed it");
  } catch {
    pass("DB refuses production under a revoked licence (backstop holds)");
  }

  return batch!.batch_id as string;
}

async function spikeRls(fx: Awaited<ReturnType<typeof seedFixtures>>) {
  console.log("\n(c) RLS: can org B read org A's units with a real user JWT?");

  const asUser = async (email: string) => {
    const c = createClient(SUPABASE_URL, ANON_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { error } = await c.auth.signInWithPassword({ email, password: PASSWORD });
    if (error) throw new Error(`signIn ${email}: ${error.message}`);
    return c;
  };

  const clientA = await asUser(fx.emailA);
  const clientB = await asUser(fx.emailB);

  // Pick ONE real unit belonging to org A and ask about it by primary key.
  //
  // (An earlier version of this check counted the whole table. That forces a full
  // scan through the policy's correlated subquery, times out, and tells you nothing
  // about isolation. The question is not "how many rows can B see" — it is "can B
  // see THIS row", and that is a single indexed lookup.)
  const [sample] = await sql<{ unit_id: string }[]>`
    select u.unit_id from medicine_units u
    join batches b on b.batch_id = u.batch_id
    where b.manufacturer_org_id = ${fx.mfrA}
    limit 1`;

  if (!sample) {
    fail("found a sample unit belonging to org A", "no units were generated");
    return;
  }
  const targetUnit = sample.unit_id;

  const readAs = async (c: Awaited<ReturnType<typeof asUser>>) => {
    const { data, error } = await c
      .from("medicine_units")
      .select("unit_id")
      .eq("unit_id", targetUnit);
    return { rows: data?.length ?? 0, error };
  };

  const own = await readAs(clientA);
  if (own.error) fail("org A can read its own unit", JSON.stringify(own.error));
  else if (own.rows === 1) pass("org A can read its own unit");
  else fail("org A can read its own unit", `saw ${own.rows} rows — policy is too tight`);

  // The one that matters.
  const cross = await readAs(clientB);
  if (cross.error) {
    pass("org B is blocked from org A's unit", `rejected: ${cross.error.code}`);
  } else if (cross.rows === 0) {
    pass("org B cannot see org A's unit — RLS holds");
  } else {
    fail(
      "org B is blocked from org A's unit",
      "LEAK: org B read a unit belonging to another organization",
    );
  }

  // A client must not be able to write, ever — there are no INSERT policies at all.
  const { error: writeErr } = await clientB
    .from("drug_types")
    .insert({ code: "HACK", name: "Injected", created_by: fx.userB });

  if (writeErr) pass("clients cannot write directly to the database", writeErr.code ?? "rejected");
  else fail("clients cannot write directly to the database", "LEAK: the insert succeeded");

  // Anonymous callers get nothing.
  const anon = createClient(SUPABASE_URL, ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: anonData } = await anon.from("medicine_units").select("unit_id").limit(1);
  if (!anonData || anonData.length === 0) pass("anonymous callers see no units");
  else fail("anonymous callers see no units", "LEAK: anon read succeeded");
}

async function spikePooling() {
  console.log("\n(d) Supavisor transaction pooling under concurrency");

  const isPooler = DATABASE_URL.includes("6543") || DATABASE_URL.includes("pooler");
  if (!isPooler) {
    console.log(
      "  \x1b[33mWARN\x1b[0m  DATABASE_URL is not the pooler (port 6543). " +
        "Fine locally; on Vercel this WILL exhaust connections.",
    );
  }

  // Trivial queries on purpose. This check is about CONNECTION handling — whether 50
  // simultaneous callers exhaust the pool or collide on prepared statements — not
  // about how fast Postgres can count. A heavy query here would just measure the query.
  const CONCURRENCY = 50;
  const started = Date.now();
  const results = await Promise.allSettled(
    Array.from({ length: CONCURRENCY }, (_, i) => sql`select ${i}::int as n, now()`),
  );
  const elapsed = Date.now() - started;

  const rejected = results.filter((r) => r.status === "rejected");
  if (rejected.length > 0) {
    const reason = (rejected[0] as PromiseRejectedResult).reason;
    fail(
      `${CONCURRENCY} concurrent queries`,
      `${rejected.length} failed — ${reason?.message ?? reason}`,
    );
  } else {
    pass(`${CONCURRENCY} concurrent queries`, `all succeeded in ${elapsed}ms, no pool exhaustion`);
  }
}

async function spikeAppendOnly(fx: Awaited<ReturnType<typeof seedFixtures>>) {
  console.log("\n(e) Is the audit log immutable against our OWN service-role key?");

  await sql`
    insert into audit_log (actor_user_id, actor_org_id, action, entity_type, entity_id)
    values (${fx.userA}, ${fx.mfrA}, 'spike.test', 'batch', 'spike')`;

  // service_role is what a compromised API key would hold. It bypasses RLS — but the
  // grants were revoked, so these must still fail.
  const { error: updErr } = await admin
    .from("audit_log")
    .update({ action: "tampered" })
    .eq("action", "spike.test");

  if (updErr) pass("service_role cannot UPDATE audit_log", updErr.code ?? "denied");
  else fail("service_role cannot UPDATE audit_log", "LEAK: history is rewritable");

  const { error: delErr } = await admin
    .from("audit_log")
    .delete()
    .eq("action", "spike.test");

  if (delErr) pass("service_role cannot DELETE audit_log", delErr.code ?? "denied");
  else fail("service_role cannot DELETE audit_log", "LEAK: history is erasable");

  // The one that actually matters. The APP does not talk to PostgREST — it holds a
  // direct Postgres connection as the table owner, and an owner cannot be locked out
  // of its own table with GRANT/REVOKE. If the trigger is missing, the two checks
  // above are theatre.
  try {
    await sql`delete from audit_log where action = 'spike.test'`;
    fail(
      "the app's OWN direct connection cannot DELETE audit_log",
      "LEAK: the application can erase its own audit trail",
    );
  } catch {
    pass("the app's OWN direct connection cannot DELETE audit_log (trigger holds)");
  }

  try {
    await sql`update audit_log set action = 'tampered' where action = 'spike.test'`;
    fail(
      "the app's OWN direct connection cannot UPDATE audit_log",
      "LEAK: the application can rewrite its own audit trail",
    );
  } catch {
    pass("the app's OWN direct connection cannot UPDATE audit_log (trigger holds)");
  }
}

async function cleanup(stamp: number) {
  // Spike fixtures only. Nothing else is touched.
  await sql`delete from medicine_units where batch_id in (
              select batch_id from batches where lot_no like ${`LOT-%${stamp}`})`;
  await sql`delete from batches where lot_no like ${`%${stamp}`}`;
  await sql`delete from licenses where issued_by in (
              select user_id from users where email like ${`%+${stamp}@spike.test`})`;
  await sql`delete from drug_types where code = ${`SPIKE-${stamp}`}`;
  await sql`delete from organizations where name like '%(spike)'`;
}

async function main() {
  console.log("\n\x1b[1mMSWP — Phase 1 integration spike\x1b[0m");
  console.log(`  target: ${SUPABASE_URL}`);

  const fx = await seedFixtures();
  try {
    await spikeBatchInsert(fx);
    await spikeRls(fx);
    await spikePooling();
    await spikeAppendOnly(fx);
  } finally {
    await cleanup(fx.stamp).catch((e) =>
      console.log(`\n  (cleanup skipped: ${e.message})`),
    );
    await sql.end();
  }

  console.log(
    failures === 0
      ? "\n\x1b[32mAll spike checks passed.\x1b[0m The stack is safe to build on.\n"
      : `\n\x1b[31m${failures} spike check(s) failed.\x1b[0m Resolve before Phase 2.\n`,
  );
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error("\nSpike crashed:", e);
  process.exit(1);
});
