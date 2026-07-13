/**
 * Times the government console the way the console actually runs it: the real service
 * functions, the real db client, all six fired concurrently.
 *
 * Written because /government took 30+ seconds to render while every query measured
 * ~100ms in isolation — which meant the problem was in how they were being run, not in
 * what they were running.
 *
 * Run:  pnpm perf
 */

import { sql } from "@/lib/db/client";
import type { Actor } from "@/lib/domain/types";
import { listDrugTypes } from "@/lib/services/drug-types";
import { listLicenses } from "@/lib/services/licenses";
import {
  flaggedUnits,
  listOrganizations,
  oversightCounts,
  recentAudit,
} from "@/lib/services/oversight";

const time = async <T>(label: string, fn: () => Promise<T>) => {
  const t = Date.now();
  try {
    const r = await fn();
    const n = Array.isArray(r) ? r.length : 1;
    const ms = Date.now() - t;
    console.log(
      `  ${String(ms).padStart(6)}ms  ${label.padEnd(18)} (${n} rows)${ms > 1000 ? "  <-- SLOW" : ""}`,
    );
    return r;
  } catch (e) {
    console.log(
      `  ${String(Date.now() - t).padStart(6)}ms  ${label.padEnd(18)} FAILED: ${(e as Error).message}`,
    );
    throw e;
  }
};

async function main() {
  const [gov] = await sql<{ org_id: string }[]>`
    select org_id from organizations where type = 'government' limit 1`;
  const [user] = await sql<{ user_id: string }[]>`
    select user_id from users limit 1`;

  const actor: Actor = {
    userId: user!.user_id,
    orgId: gov!.org_id,
    orgType: "government",
    role: "admin",
    mfaVerified: true,
  };

  console.log("\n  sequential:");
  await time("counts", () => oversightCounts(actor));
  await time("drug types", () => listDrugTypes(actor));
  await time("licences", () => listLicenses(actor));
  await time("organizations", () => listOrganizations(actor));
  await time("flagged", () => flaggedUnits(actor));
  await time("audit", () => recentAudit(actor));

  console.log("\n  concurrent (as the page does it):");
  const t = Date.now();
  await Promise.all([
    time("counts", () => oversightCounts(actor)),
    time("drug types", () => listDrugTypes(actor)),
    time("licences", () => listLicenses(actor)),
    time("organizations", () => listOrganizations(actor)),
    time("flagged", () => flaggedUnits(actor)),
    time("audit", () => recentAudit(actor)),
  ]);
  console.log(`  ${String(Date.now() - t).padStart(6)}ms  TOTAL\n`);

  await sql.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
