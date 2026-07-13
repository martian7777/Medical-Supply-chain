import { assertGovernment, assertStepUpIfPrivileged } from "@/lib/domain/access";
import { DomainError, invalid } from "@/lib/domain/errors";
import type { Actor } from "@/lib/domain/types";
import { sql } from "@/lib/db/client";

import { audit } from "./audit";

/** GOV-1. Every participant may read the catalogue; only Government may write it. */

export async function createDrugType(
  actor: Actor,
  input: { code: string; name: string; description?: string },
) {
  assertGovernment(actor);
  assertStepUpIfPrivileged(actor);

  if (input.name.trim().length === 0) throw invalid("name is required");

  return sql.begin(async (tx) => {
    const existing = await tx`
      select 1 from drug_types where code = ${input.code}`;
    if (existing.length > 0) {
      throw new DomainError("CONFLICT", "a drug type with this code already exists", {
        code: input.code,
      });
    }

    const [drug] = await tx<{ drug_type_id: string }[]>`
      insert into drug_types (code, name, description, created_by)
      values (${input.code}, ${input.name}, ${input.description ?? null}, ${actor.userId})
      returning drug_type_id`;

    await audit(tx, actor, "drug_type.created", "drug_type", drug!.drug_type_id, {
      code: input.code,
      name: input.name,
    });

    return { drugTypeId: drug!.drug_type_id };
  });
}

export async function listDrugTypes(_actor: Actor) {
  const rows = await sql<
    { drug_type_id: string; code: string; name: string; description: string | null }[]
  >`
    select drug_type_id, code, name, description
    from drug_types order by name`;

  return rows.map((r) => ({
    drugTypeId: r.drug_type_id,
    code: r.code,
    name: r.name,
    description: r.description,
  }));
}
