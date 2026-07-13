/** Narrowing the hang: does lib/db/client itself connect? */

import { sql } from "@/lib/db/client";

async function main() {
  console.log("1. module imported, client constructed");

  const t = Date.now();
  console.log("2. running trivial query…");
  const r = await sql`select 1 as ok`;
  console.log(`3. done in ${Date.now() - t}ms`, r);

  const t2 = Date.now();
  const rows = await sql`select count(*)::int as n from organizations`;
  console.log(`4. count in ${Date.now() - t2}ms`, rows);

  await sql.end();
  console.log("5. closed.");
}

main().catch((e) => {
  console.error("FAILED:", e);
  process.exit(1);
});
