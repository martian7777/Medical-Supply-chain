/**
 * Migration runner.
 *
 * Applies supabase/migrations/*.sql in filename order, exactly once each, recording
 * what it applied. Uses only DATABASE_URL — no `supabase link`, no interactive login,
 * so it works identically on a laptop and in CI.
 *
 * Run:  pnpm db:migrate
 */

import { createHash } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

import postgres from "postgres";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("DATABASE_URL is not set.");
  process.exit(1);
}

const MIGRATIONS_DIR = join(process.cwd(), "supabase", "migrations");

// Migrations are DDL: use the simple protocol and a single connection.
const sql = postgres(DATABASE_URL, { max: 1, prepare: false, idle_timeout: 5 });

async function main() {
  await sql`
    create table if not exists schema_migrations (
      name        text primary key,
      checksum    text not null,
      applied_at  timestamptz not null default now()
    )`.simple();

  const applied = new Map<string, string>(
    (
      await sql<{ name: string; checksum: string }[]>`
        select name, checksum from schema_migrations`
    ).map((r) => [r.name, r.checksum]),
  );

  const files = readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  let ran = 0;

  for (const file of files) {
    const body = readFileSync(join(MIGRATIONS_DIR, file), "utf8");
    const checksum = createHash("sha256").update(body).digest("hex").slice(0, 16);
    const previous = applied.get(file);

    if (previous === checksum) {
      console.log(`  skip   ${file}`);
      continue;
    }
    if (previous && previous !== checksum) {
      // An applied migration was edited after the fact. Silently re-running it would
      // corrupt the schema; refusing loudly is the only safe move.
      console.error(
        `\n  ${file} has changed since it was applied.\n` +
          `  Edit history is not rewritable — add a NEW migration instead.\n`,
      );
      process.exit(1);
    }

    process.stdout.write(`  apply  ${file} ... `);
    try {
      await sql.unsafe(body).simple();
      await sql`
        insert into schema_migrations (name, checksum) values (${file}, ${checksum})`;
      console.log("ok");
      ran++;
    } catch (e) {
      console.log("FAILED");
      console.error(`\n${(e as Error).message}\n`);
      process.exit(1);
    }
  }

  console.log(
    ran === 0
      ? "\n  Schema already up to date.\n"
      : `\n  Applied ${ran} migration(s).\n`,
  );
  await sql.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
