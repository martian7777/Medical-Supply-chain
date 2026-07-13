import type postgres from "postgres";

import type { Actor } from "@/lib/domain/types";

/**
 * SYS-1 / NFR §4: every state-changing business event is recorded.
 *
 * The audit write takes the SAME transaction handle as the state change, so the two
 * commit or fail together. An audit log written afterwards, outside the transaction,
 * is a log that silently loses entries whenever the process dies at the wrong moment —
 * which, for a regulatory system, is the one thing it must never do.
 *
 * `audit_log` is append-only at the grant level (UPDATE/DELETE revoked from every
 * role, including service_role), so this is genuinely write-once.
 */

export type AuditAction =
  | "organization.registered"
  | "drug_type.created"
  | "license.issued"
  | "license.revoked"
  | "license.prolonged"
  | "batch.created"
  | "shipment.dispatched"
  | "shipment.accepted"
  | "shipment.rejected"
  | "shipment.partially_accepted"
  | "unit.dispensed";

/** What may be recorded in an audit payload. Deliberately JSON-shaped, not `unknown`. */
export type AuditPayload = Record<string, postgres.JSONValue>;

export async function audit(
  tx: postgres.TransactionSql,
  actor: Actor,
  action: AuditAction,
  entityType: string,
  entityId: string,
  payload: AuditPayload = {},
): Promise<void> {
  // Serialize explicitly rather than relying on the driver to infer jsonb from a plain
  // object — it does not, and the failure is an opaque type error from deep inside the
  // wire protocol rather than anything that names `payload`.
  await tx`
    insert into audit_log
      (actor_user_id, actor_org_id, action, entity_type, entity_id, payload)
    values
      (${actor.userId}, ${actor.orgId}, ${action}, ${entityType}, ${entityId},
       ${JSON.stringify(payload)}::jsonb)`;
}

/** Today, UTC, as YYYY-MM-DD — the form every date rule in lib/domain compares against. */
export function today(): string {
  return new Date().toISOString().slice(0, 10);
}
